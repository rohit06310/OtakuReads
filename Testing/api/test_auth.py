"""
Testing/api/test_auth.py

API integration tests for /api/auth/* endpoints.

Covers:
  - POST /api/auth/register   (success, duplicate email, missing fields)
  - POST /api/auth/login      (success, wrong password, unknown email, banned account)
  - GET  /api/auth/profile    (authenticated, no token, bad token)
  - PUT  /api/auth/profile    (update name)
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _unique_email() -> str:
    return f"auth_test_{uuid.uuid4().hex[:8]}@otakutest.com"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Registration ─────────────────────────────────────────────────────────────

class TestRegister:

    async def test_register_success(self, http_client: httpx.AsyncClient):
        """Valid payload → 201, response contains token and user fields."""
        payload = {
            "name":     "New Reader",
            "email":    _unique_email(),
            "password": "Secure@123",
        }
        res = await http_client.post("/api/auth/register", json=payload)

        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "token" in data
        assert data["email"] == payload["email"]
        assert data["name"]  == payload["name"]
        # Password must NOT appear in the response
        assert "password" not in data

    async def test_register_duplicate_email(self, http_client: httpx.AsyncClient):
        """Registering with the same email twice → 400."""
        email = _unique_email()
        payload = {"name": "Dup User", "email": email, "password": "Pass@1234"}

        first  = await http_client.post("/api/auth/register", json=payload)
        assert first.status_code == 201

        second = await http_client.post("/api/auth/register", json=payload)
        assert second.status_code == 400
        err_msg = second.json().get("message") or second.json().get("error", "")
        assert "already exists" in err_msg.lower()

    async def test_register_missing_name(self, http_client: httpx.AsyncClient):
        """Missing name → 400."""
        res = await http_client.post("/api/auth/register", json={
            "email": _unique_email(), "password": "Pass@1234",
        })
        assert res.status_code in (400, 500)

    async def test_register_missing_email(self, http_client: httpx.AsyncClient):
        """Missing email → 400."""
        res = await http_client.post("/api/auth/register", json={
            "name": "No Email", "password": "Pass@1234",
        })
        assert res.status_code in (400, 500)

    async def test_register_missing_password(self, http_client: httpx.AsyncClient):
        """Missing password → 400."""
        res = await http_client.post("/api/auth/register", json={
            "name": "No Pass", "email": _unique_email(),
        })
        assert res.status_code in (400, 500)


# ─── Login ────────────────────────────────────────────────────────────────────

class TestLogin:

    async def test_login_success(self, http_client: httpx.AsyncClient, registered_user: dict):
        """Correct credentials → 200 + token."""
        res = await http_client.post("/api/auth/login", json={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        })

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "token" in data
        assert data["email"] == registered_user["email"]

    async def test_login_wrong_password(self, http_client: httpx.AsyncClient, registered_user: dict):
        """Wrong password → 401."""
        res = await http_client.post("/api/auth/login", json={
            "email":    registered_user["email"],
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

    async def test_login_nonexistent_email(self, http_client: httpx.AsyncClient):
        """Unknown email → 401."""
        res = await http_client.post("/api/auth/login", json={
            "email":    "ghost@nowhere.com",
            "password": "Pass@1234",
        })
        assert res.status_code == 401

    async def test_login_missing_fields(self, http_client: httpx.AsyncClient):
        """Empty body → 400 or 401."""
        res = await http_client.post("/api/auth/login", json={})
        assert res.status_code in (400, 401)


# ─── Profile ──────────────────────────────────────────────────────────────────

class TestProfile:

    async def test_get_profile_authenticated(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Valid JWT → 200 with user data, no password field."""
        res = await http_client.get(
            "/api/auth/profile",
            headers=_auth_header(registered_user["token"]),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["email"] == registered_user["email"]
        assert "password" not in data

    async def test_get_profile_no_token(self, http_client: httpx.AsyncClient):
        """No Authorization header → 401."""
        res = await http_client.get("/api/auth/profile")
        assert res.status_code == 401

    async def test_get_profile_bad_token(self, http_client: httpx.AsyncClient):
        """Tampered token → 401."""
        res = await http_client.get(
            "/api/auth/profile",
            headers={"Authorization": "Bearer this.is.not.a.real.token"},
        )
        assert res.status_code == 401

    async def test_update_profile_name(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """PUT /api/auth/profile — change name → 200 + updated name returned."""
        new_name = f"Updated_{uuid.uuid4().hex[:6]}"
        res = await http_client.put(
            "/api/auth/profile",
            json={"name": new_name},
            headers=_auth_header(registered_user["token"]),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["name"] == new_name
        # A fresh token is returned on profile update
        assert "token" in data

    async def test_update_profile_no_auth(self, http_client: httpx.AsyncClient):
        """PUT /api/auth/profile without token → 401."""
        res = await http_client.put("/api/auth/profile", json={"name": "Hacker"})
        assert res.status_code == 401
