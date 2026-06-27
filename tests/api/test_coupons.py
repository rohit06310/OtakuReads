"""
tests/api/test_coupons.py
━━━━━━━━━━━━━━━━━━━━━━━━
API integration tests for /api/coupons/* routes.

Covers:
  - POST /api/coupons           (admin creates, reader forbidden, unauthenticated)
  - GET  /api/coupons           (admin only)
  - POST /api/coupons/validate  (valid, expired, maxed-out, below-min-amount, not found)
  - Duplicate coupon code rejection
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _coupon_payload(**overrides) -> dict:
    base = {
        "code": f"QA_{uuid.uuid4().hex[:6].upper()}",
        "discountType": "percentage",
        "discountValue": 15,
        "minOrderAmount": 0,
        "maxUses": 100,
        "expiresAt": "2099-12-31T00:00:00.000Z",
        "isActive": True,
    }
    base.update(overrides)
    return base


# ─── Create Coupon ───────────────────────────────────────────────────────────

class TestCreateCoupon:
    async def test_create_coupon_as_admin_success(
        self,
        http_client: httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin can create a percentage coupon → 201."""
        headers = _auth_headers(admin_credentials["token"])
        res = await http_client.post("/api/coupons", json=_coupon_payload(), headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert data["coupon"]["discountType"] == "percentage"
        assert data["coupon"]["isActive"] is True

    async def test_create_fixed_coupon(
        self,
        http_client: httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin can create a fixed-amount coupon."""
        headers = _auth_headers(admin_credentials["token"])
        payload = _coupon_payload(discountType="fixed", discountValue=50)
        res = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert res.status_code == 201
        assert res.json()["coupon"]["discountType"] == "fixed"

    async def test_create_coupon_as_reader_forbidden(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reader cannot create coupons → 403."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post("/api/coupons", json=_coupon_payload(), headers=headers)
        assert res.status_code == 403

    async def test_create_coupon_unauthenticated(self, http_client: httpx.AsyncClient):
        """No token → 401."""
        res = await http_client.post("/api/coupons", json=_coupon_payload())
        assert res.status_code == 401

    async def test_create_duplicate_coupon_code(
        self,
        http_client: httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Two coupons with the same code should fail on the second → 400."""
        headers = _auth_headers(admin_credentials["token"])
        payload = _coupon_payload()
        first = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert first.status_code == 201

        # Try again with identical code
        second = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert second.status_code == 400
        msg = second.json().get("message", "") or second.json().get("error", "")
        assert "already exists" in msg.lower()

    async def test_coupon_code_stored_uppercase(
        self,
        http_client: httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Coupon code is always uppercased regardless of input case."""
        headers = _auth_headers(admin_credentials["token"])
        payload = _coupon_payload(code="lowercase_code")
        res = await http_client.post("/api/coupons", json=payload, headers=headers)
        assert res.status_code == 201
        assert res.json()["coupon"]["code"] == "LOWERCASE_CODE"


# ─── Get All Coupons ─────────────────────────────────────────────────────────

class TestGetCoupons:
    async def test_get_coupons_as_admin(
        self,
        http_client: httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin can list all coupons."""
        headers = _auth_headers(admin_credentials["token"])
        res = await http_client.get("/api/coupons", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["coupons"], list)

    async def test_get_coupons_as_reader_forbidden(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reader cannot list coupons → 403."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.get("/api/coupons", headers=headers)
        assert res.status_code == 403

    async def test_get_coupons_unauthenticated(self, http_client: httpx.AsyncClient):
        """No token → 401."""
        res = await http_client.get("/api/coupons")
        assert res.status_code == 401


# ─── Validate Coupon ─────────────────────────────────────────────────────────

class TestValidateCoupon:
    async def test_validate_valid_coupon(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_coupon_valid: dict,
    ):
        """A valid coupon returns 200 with discount info."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_valid["code"], "orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "discountValue" in data["coupon"]
        assert data["coupon"]["discountValue"] == sample_coupon_valid["discountValue"]

    async def test_validate_valid_coupon_case_insensitive(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_coupon_valid: dict,
    ):
        """Coupon validation should be case-insensitive."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_valid["code"].lower(), "orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 200

    async def test_validate_expired_coupon(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_coupon_expired: dict,
    ):
        """An expired coupon returns 400."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_expired["code"], "orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 400
        msg = res.json().get("message", "") or res.json().get("error", "")
        assert "invalid" in msg.lower() or "expired" in msg.lower()

    async def test_validate_maxed_out_coupon(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_coupon_maxed: dict,
    ):
        """A coupon that has hit its max uses returns 400."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_maxed["code"], "orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 400

    async def test_validate_coupon_below_min_amount(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        admin_credentials: dict,
    ):
        """Coupon with minOrderAmount not met → 400."""
        # Create a coupon requiring ₹1000 minimum
        admin_headers = _auth_headers(admin_credentials["token"])
        payload = _coupon_payload(minOrderAmount=1000)
        create_res = await http_client.post("/api/coupons", json=payload, headers=admin_headers)
        assert create_res.status_code == 201
        code = create_res.json()["coupon"]["code"]

        # Validate with order amount below minimum
        user_headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": code, "orderAmount": 200},
            headers=user_headers,
        )
        assert res.status_code == 400

    async def test_validate_nonexistent_coupon(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Validating a coupon code that doesn't exist → 404."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": "DOESNOTEXIST999", "orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 404

    async def test_validate_without_code(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Sending a validate request without a 'code' field → 400."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/coupons/validate",
            json={"orderAmount": 500},
            headers=headers,
        )
        assert res.status_code == 400

    async def test_validate_coupon_unauthenticated(
        self,
        http_client: httpx.AsyncClient,
        sample_coupon_valid: dict,
    ):
        """No token → 401."""
        res = await http_client.post(
            "/api/coupons/validate",
            json={"code": sample_coupon_valid["code"], "orderAmount": 500},
        )
        assert res.status_code == 401
