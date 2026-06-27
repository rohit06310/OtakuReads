"""
tests/api/conftest.py — fixtures specific to API integration tests.

Strategy:
  - Every user created by a fixture gets a UUID-based unique email so parallel
    or repeated test runs never collide in the shared database.
  - The first registered user on a fresh DB becomes admin (backend behaviour).
    For tests that need admin, we register a user via a dedicated seeded email,
    relying on the fact that conftest fixtures run before individual test user
    registrations. For a fully isolated run, seed your DB with an admin first
    OR set the ADMIN_EMAIL / ADMIN_PASSWORD env vars pointing to an existing admin.
"""

import uuid
import os
import pytest
import httpx


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _unique_email(prefix: str = "user") -> str:
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@otakutest.com"


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
async def admin_credentials(backend_url: str) -> dict:
    """
    Returns credentials for an admin account.
    Uses ADMIN_EMAIL / ADMIN_PASSWORD env vars if set (recommended for shared DBs),
    otherwise attempts to log in with seeded admin@otakureads.com, and then
    attempts to register a fresh user (works only if DB is empty).
    """
    email = os.environ.get("ADMIN_EMAIL", "admin@otakureads.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")

    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        # 1. Attempt login with admin email
        res = await client.post("/api/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            data = res.json()
            return {"email": email, "password": password, "token": data["token"], "id": str(data["_id"])}

        # 2. Fallback — register a new admin (first user trick)
        fallback_email = _unique_email("admin")
        fallback_password = "Admin@12345"
        res = await client.post("/api/auth/register", json={
            "name": "Test Admin",
            "email": fallback_email,
            "password": fallback_password,
        })
        assert res.status_code == 201, f"Admin registration failed: {res.text}"
        data = res.json()
        return {"email": fallback_email, "password": fallback_password, "token": data["token"], "id": str(data["_id"])}


@pytest.fixture
async def registered_user(backend_url: str) -> dict:
    """
    Registers a fresh reader user per test and returns
    {name, email, password, token, id}.
    """
    password = "TestPass@123"
    email = _unique_email("reader")
    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        res = await client.post("/api/auth/register", json={
            "name": "Test Reader",
            "email": email,
            "password": password,
        })
        assert res.status_code == 201, f"User registration failed: {res.text}"
        data = res.json()
        return {
            "name": "Test Reader",
            "email": email,
            "password": password,
            "token": data["token"],
            "id": str(data["_id"]),
        }


@pytest.fixture
async def sample_book(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """
    Creates a book via the admin API and yields its data.
    The book is NOT deleted after the test (keeps the DB realistic).
    """
    headers = _auth_headers(admin_credentials["token"])
    payload = {
        "title": f"Test Manga {uuid.uuid4().hex[:6]}",
        "author": "Test Author",
        "price": 299,
        "coverImage": "https://placehold.co/300x400",
        "description": "A test manga for the QA suite.",
        "category": "Manga",
        "pages": 180,
        "stock": 50,
    }
    res = await http_client.post("/api/books", json=payload, headers=headers)
    assert res.status_code == 201, f"Book creation failed: {res.text}"
    return res.json()["book"]


@pytest.fixture
async def sample_coupon_valid(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a valid 20% coupon (expires far in the future)."""
    headers = _auth_headers(admin_credentials["token"])
    code = f"SAVE20_{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "code": code,
        "discountType": "percentage",
        "discountValue": 20,
        "minOrderAmount": 0,
        "maxUses": 100,
        "expiresAt": "2099-12-31T00:00:00.000Z",
        "isActive": True,
    }
    res = await http_client.post("/api/coupons", json=payload, headers=headers)
    assert res.status_code == 201, f"Coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def sample_coupon_expired(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates an already-expired coupon."""
    headers = _auth_headers(admin_credentials["token"])
    code = f"EXPIRED_{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "code": code,
        "discountType": "fixed",
        "discountValue": 50,
        "minOrderAmount": 0,
        "expiresAt": "2000-01-01T00:00:00.000Z",
        "isActive": True,
    }
    res = await http_client.post("/api/coupons", json=payload, headers=headers)
    assert res.status_code == 201, f"Expired coupon creation failed: {res.text}"
    return res.json()["coupon"]


@pytest.fixture
async def sample_coupon_maxed(http_client: httpx.AsyncClient, admin_credentials: dict) -> dict:
    """Creates a coupon that has already hit its max-use limit."""
    headers = _auth_headers(admin_credentials["token"])
    code = f"MAXED_{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "code": code,
        "discountType": "percentage",
        "discountValue": 10,
        "maxUses": 1,
        "expiresAt": "2099-12-31T00:00:00.000Z",
        "isActive": True,
    }
    res = await http_client.post("/api/coupons", json=payload, headers=headers)
    assert res.status_code == 201
    coupon = res.json()["coupon"]

    # Use it once to max it out (create a real order)
    # We'll do this via the validate endpoint which doesn't consume uses,
    # so instead we'll directly set currentUses >= maxUses via a second admin endpoint.
    # The simplest approach: create a coupon with maxUses=0 (already maxed from creation).
    code2 = f"MAXED0_{uuid.uuid4().hex[:6].upper()}"
    payload2 = {**payload, "code": code2, "maxUses": 0}
    res2 = await http_client.post("/api/coupons", json=payload2, headers=headers)
    assert res2.status_code == 201
    return res2.json()["coupon"]
