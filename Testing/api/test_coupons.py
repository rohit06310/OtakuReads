"""
Testing/api/test_coupons.py

API integration tests for /api/coupons/* endpoints.

Covers:
  - POST /api/coupons           (admin create, reader 403)
  - POST /api/coupons/validate  (valid, expired, maxed, missing code, not found, min-amount)
  - GET  /api/coupons           (admin list, reader 403)
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _coupon_payload(suffix: str = "") -> dict:
    code = f"TEST_{(suffix or uuid.uuid4().hex[:6]).upper()}"
    return {
        "code":          code,
        "discountType":  "percentage",
        "discountValue": 10,
        "minOrderAmount": 0,
        "maxUses":       50,
        "expiresAt":     "2099-12-31T00:00:00.000Z",
        "isActive":      True,
    }


# ─── Create Coupon ────────────────────────────────────────────────────────────

class TestCreateCoupon:

    async def test_create_coupon_as_admin(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin creates coupon → 201 + coupon object in response."""
        res = await http_client.post(
            "/api/coupons",
            json=_coupon_payload(),
            headers=_auth_header(admin_credentials["token"]),
        )

        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "coupon" in data
        assert "_id" in data["coupon"]

    async def test_create_coupon_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reader tries to create coupon → 403."""
        res = await http_client.post(
            "/api/coupons",
            json=_coupon_payload(),
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403

    async def test_create_coupon_without_auth(self, http_client: httpx.AsyncClient):
        """No token → 401."""
        res = await http_client.post("/api/coupons", json=_coupon_payload())
        assert res.status_code == 401

    async def test_create_duplicate_coupon_code(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Creating two coupons with the same code → second one returns 400."""
        payload = _coupon_payload()
        headers = _auth_header(admin_credentials["token"])

        first  = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert first.status_code == 201

        second = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert second.status_code == 400


# ─── Validate Coupon ──────────────────────────────────────────────────────────

class TestValidateCoupon:

    async def test_validate_valid_coupon(
        self,
        http_client:         httpx.AsyncClient,
        registered_user:     dict,
        sample_coupon_valid: dict,
    ):
        """Valid coupon + sufficient amount → 200 + discount info."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_valid["code"], "orderAmount": 500},
            headers=_auth_header(registered_user["token"]),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "coupon" in data
        assert data["coupon"]["code"] == sample_coupon_valid["code"]

    async def test_validate_expired_coupon(
        self,
        http_client:           httpx.AsyncClient,
        registered_user:       dict,
        sample_coupon_expired: dict,
    ):
        """Expired coupon → 400."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_expired["code"], "orderAmount": 500},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_validate_maxed_coupon(
        self,
        http_client:          httpx.AsyncClient,
        registered_user:      dict,
        sample_coupon_maxed:  dict,
    ):
        """Coupon with maxUses=0 (already at limit) → 400."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_maxed["code"], "orderAmount": 500},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_validate_missing_code(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """No code in request body → 400."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"orderAmount": 500},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_validate_nonexistent_coupon(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Unknown coupon code → 404."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": "DOESNOTEXIST999", "orderAmount": 500},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 404

    async def test_validate_coupon_min_amount_not_met(
        self,
        http_client:              httpx.AsyncClient,
        registered_user:          dict,
        sample_coupon_min_amount: dict,
    ):
        """
        Coupon requires ₹99999 minimum but order is only ₹100 → 400.
        """
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_min_amount["code"], "orderAmount": 100},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_validate_coupon_no_auth(
        self,
        http_client:         httpx.AsyncClient,
        sample_coupon_valid: dict,
    ):
        """Validate endpoint without token → 401."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_valid["code"], "orderAmount": 500},
        )
        assert res.status_code == 401


# ─── List Coupons ─────────────────────────────────────────────────────────────

class TestGetCoupons:

    async def test_get_coupons_as_admin(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin GET /api/coupons → 200 + list of coupons."""
        res = await http_client.get(
            "/api/coupons",
            headers=_auth_header(admin_credentials["token"]),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["coupons"], list)

    async def test_get_coupons_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reader GET /api/coupons → 403."""
        res = await http_client.get(
            "/api/coupons",
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403
