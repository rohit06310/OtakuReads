"""
Testing/api/conftest.py — fixtures specific to API integration tests.

Strategy:
  - Every user created by a fixture gets a UUID-based unique email so parallel
    or repeated test runs never collide in the shared MongoDB.
  - Admin account: reads ADMIN_EMAIL / ADMIN_PASSWORD env vars (recommended
    for a seeded DB). Falls back to registering a brand-new user — this only
    becomes admin if the DB is empty (backend's first-user-is-admin rule).
"""

import os
import uuid
import pytest
import httpx


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _unique_email(prefix: str = "user") -> str:
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@otakutest.com"


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
async def admin_credentials(backend_url: str) -> dict:
    """
    Returns {email, password, token, id} for an admin account.
    Uses ADMIN_EMAIL / ADMIN_PASSWORD env vars when set (recommended).
    Falls back to registering a new user (works only on a clean DB).
    """
    email    = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")

    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        if email:
            res = await client.post("/api/auth/login", json={"email": email, "password": password})
            assert res.status_code == 200, f"Admin login failed: {res.text}"
            data = res.json()
            return {"email": email, "password": password,
                    "token": data["token"], "id": str(data["_id"])}

        # Fallback: register as first user (first user = admin on fresh DB)
        email = _unique_email("admin")
        res = await client.post("/api/auth/register", json={
            "name": "Test Admin", "email": email, "password": password,
        })
        assert res.status_code == 201, f"Admin registration failed: {res.text}"
        data = res.json()
        return {"email": email, "password": password,
                "token": data["token"], "id": str(data["_id"])}


@pytest.fixture
async def registered_user(backend_url: str) -> dict:
    """
    Registers a fresh reader per test; yields {name, email, password, token, id}.
    """
    password = "TestPass@123"
    email    = _unique_email("reader")
    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        res = await client.post("/api/auth/register", json={
            "name": "Test Reader", "email": email, "password": password,
        })
        assert res.status_code == 201, f"User registration failed: {res.text}"
        data = res.json()
        return {
            "name": "Test Reader", "email": email, "password": password,
            "token": data["token"], "id": str(data["_id"]),
        }


@pytest.fixture
async def sample_book(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a book via the admin API and returns its data."""
    headers = _auth_headers(admin_credentials["token"])
    payload = {
        "title":       f"Test Manga {uuid.uuid4().hex[:6]}",
        "author":      "Test Author",
        "price":       299,
        "coverImage":  "https://placehold.co/300x400",
        "description": "A test manga for the QA suite.",
        "category":    "Manga",
        "pages":       180,
        "stock":       50,
    }
    res = await http_client.post("/api/books", json=payload, headers=headers)
    assert res.status_code == 201, f"Book creation failed: {res.text}"
    return res.json()["book"]


@pytest.fixture
async def sample_coupon_valid(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a valid 20% off coupon that expires far in the future."""
    headers = _auth_headers(admin_credentials["token"])
    code    = f"SAVE20_{uuid.uuid4().hex[:6].upper()}"
    res = await http_client.post("/api/coupons", json={
        "code":          code,
        "discountType":  "percentage",
        "discountValue": 20,
        "minOrderAmount": 0,
        "maxUses":       100,
        "expiresAt":     "2099-12-31T00:00:00.000Z",
        "isActive":      True,
    }, headers=headers)
    assert res.status_code == 201, f"Coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def sample_coupon_expired(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates an already-expired coupon."""
    headers = _auth_headers(admin_credentials["token"])
    code    = f"EXPIRED_{uuid.uuid4().hex[:6].upper()}"
    res = await http_client.post("/api/coupons", json={
        "code":          code,
        "discountType":  "fixed",
        "discountValue": 50,
        "minOrderAmount": 0,
        "expiresAt":     "2000-01-01T00:00:00.000Z",
        "isActive":      True,
    }, headers=headers)
    assert res.status_code == 201, f"Expired coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def sample_coupon_maxed(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a coupon with maxUses=0 — already at its limit from creation."""
    headers = _auth_headers(admin_credentials["token"])
    code    = f"MAXED_{uuid.uuid4().hex[:6].upper()}"
    res = await http_client.post("/api/coupons", json={
        "code":          code,
        "discountType":  "percentage",
        "discountValue": 10,
        "maxUses":       0,
        "expiresAt":     "2099-12-31T00:00:00.000Z",
        "isActive":      True,
    }, headers=headers)
    assert res.status_code == 201, f"Maxed coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def sample_coupon_min_amount(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a coupon with a very high minimum order amount (₹99999)."""
    headers = _auth_headers(admin_credentials["token"])
    code    = f"MINAMOUNT_{uuid.uuid4().hex[:6].upper()}"
    res = await http_client.post("/api/coupons", json={
        "code":           code,
        "discountType":   "percentage",
        "discountValue":  15,
        "minOrderAmount": 99999,
        "maxUses":        100,
        "expiresAt":      "2099-12-31T00:00:00.000Z",
        "isActive":       True,
    }, headers=headers)
    assert res.status_code == 201, f"Min-amount coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def placed_order(
    http_client:       httpx.AsyncClient,
    registered_user:   dict,
    sample_book:       dict,
) -> dict:
    """
    Places a real order as `registered_user` for `sample_book`.
    Useful for 'verified purchase' tests in reviews.
    """
    headers = _auth_headers(registered_user["token"])
    res = await http_client.post("/api/orders", json={
        "items": [{"bookId": sample_book["_id"], "quantity": 1}],
        "total": sample_book["price"],
        "paymentId": f"pay_test_{uuid.uuid4().hex[:10]}",
        "orderId":   f"order_test_{uuid.uuid4().hex[:10]}",
    }, headers=headers)
    assert res.status_code == 201, f"Order placement failed: {res.text}"
    return {
        "order": res.json()["order"],
        "user":  registered_user,
        "book":  sample_book,
    }
