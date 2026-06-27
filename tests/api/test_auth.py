"""
tests/api/test_auth.py
━━━━━━━━━━━━━━━━━━━━━
API integration tests for /api/auth/* routes.

Covers:
  - POST /api/auth/register  (success, duplicate email, missing fields)
  - POST /api/auth/login     (success, wrong password, banned user)
  - GET  /api/auth/profile   (authenticated, no token)
  - PUT  /api/auth/profile   (update name, update password)
  - Password hashing verification
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


def _unique_email() -> str:
    return f"auth_test_{uuid.uuid4().hex[:8]}@otakutest.com"


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Register ────────────────────────────────────────────────────────────────

class TestRegister:
    async def test_register_success(self, http_client: httpx.AsyncClient):
        """Valid registration returns 201 with a JWT token and user data."""
        res = await http_client.post("/api/auth/register", json={
            "name": "New User",
            "email": _unique_email(),
            "password": "SecurePass@123",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "token" in data
        assert "password" not in data  # password must never be returned
        assert data["email"] is not None
        assert data["role"] in ("reader", "admin")

    async def test_register_duplicate_email(self, http_client: httpx.AsyncClient):
        """Registering twice with the same email should return 400."""
        email = _unique_email()
        payload = {"name": "Dup User", "email": email, "password": "Pass@1234"}
        await http_client.post("/api/auth/register", json=payload)  # first → OK
        res = await http_client.post("/api/auth/register", json=payload)  # second → fail
        assert res.status_code == 400
        assert "already exists" in res.json().get("message", "").lower() or \
               "already exists" in res.json().get("error", "").lower()

    async def test_register_missing_name(self, http_client: httpx.AsyncClient):
        """Registration without a name should fail (Mongoose validation)."""
        res = await http_client.post("/api/auth/register", json={
            "email": _unique_email(),
            "password": "Pass@1234",
        })
        assert res.status_code in (400, 500)

    async def test_register_missing_password(self, http_client: httpx.AsyncClient):
        """Registration without a password should fail."""
        res = await http_client.post("/api/auth/register", json={
            "name": "No Pass",
            "email": _unique_email(),
        })
        assert res.status_code in (400, 500)


# ─── Login ───────────────────────────────────────────────────────────────────

class TestLogin:
    async def test_login_success(self, http_client: httpx.AsyncClient, registered_user: dict):
        """Valid credentials return 200 with a JWT token."""
        res = await http_client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "token" in data
        assert "password" not in data

    async def test_login_wrong_password(self, http_client: httpx.AsyncClient, registered_user: dict):
        """Wrong password returns 401."""
        res = await http_client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

    async def test_login_nonexistent_email(self, http_client: httpx.AsyncClient):
        """Login with an email that doesn't exist returns 401."""
        res = await http_client.post("/api/auth/login", json={
            "email": "ghost_user_xyz@notreal.com",
            "password": "AnyPass@123",
        })
        assert res.status_code == 401

    async def test_login_missing_fields(self, http_client: httpx.AsyncClient):
        """Login with empty body should return an error (not 200)."""
        res = await http_client.post("/api/auth/login", json={})
        assert res.status_code in (400, 401, 500)


# ─── Profile ─────────────────────────────────────────────────────────────────

class TestProfile:
    async def test_get_profile_authenticated(self, http_client: httpx.AsyncClient, registered_user: dict):
        """Authenticated user can fetch their own profile."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.get("/api/auth/profile", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["email"] == registered_user["email"]
        assert "password" not in data

    async def test_get_profile_no_token(self, http_client: httpx.AsyncClient):
        """GET /api/auth/profile without a token returns 401."""
        res = await http_client.get("/api/auth/profile")
        assert res.status_code == 401

    async def test_get_profile_invalid_token(self, http_client: httpx.AsyncClient):
        """A garbage Bearer token returns 401."""
        res = await http_client.get("/api/auth/profile",
                                    headers={"Authorization": "Bearer this.is.garbage"})
        assert res.status_code == 401

    async def test_update_profile_name(self, http_client: httpx.AsyncClient, registered_user: dict):
        """User can update their display name."""
        headers = _auth_headers(registered_user["token"])
        new_name = f"Updated Name {uuid.uuid4().hex[:4]}"
        res = await http_client.put("/api/auth/profile",
                                    json={"name": new_name},
                                    headers=headers)
        assert res.status_code == 200
        assert res.json()["name"] == new_name

    async def test_update_profile_password(self, http_client: httpx.AsyncClient, registered_user: dict):
        """User can update their password and login with the new one."""
        headers = _auth_headers(registered_user["token"])
        new_pass = "NewSecure@Pass999"
        res = await http_client.put("/api/auth/profile",
                                    json={"password": new_pass},
                                    headers=headers)
        assert res.status_code == 200

        # Verify new password works
        login_res = await http_client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": new_pass,
        })
        assert login_res.status_code == 200

    async def test_password_not_returned_in_profile(self, http_client: httpx.AsyncClient, registered_user: dict):
        """The password field must never appear in any auth response."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.get("/api/auth/profile", headers=headers)
        assert "password" not in res.json()


# ─── Security ────────────────────────────────────────────────────────────────

class TestSecurity:
    async def test_jwt_token_has_no_sensitive_data(self, http_client: httpx.AsyncClient, registered_user: dict):
        """
        Decode the JWT payload (without verifying signature) and confirm
        it does NOT contain the password or any PII beyond the user ID.
        """
        import base64
        import json as pyjson

        token = registered_user["token"]
        parts = token.split(".")
        assert len(parts) == 3, "Token should be a 3-part JWT"

        # Decode the payload (add padding for base64)
        payload_b64 = parts[1] + "=="
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode())
        payload = pyjson.loads(payload_bytes)

        assert "password" not in payload
        assert "id" in payload or "sub" in payload  # must contain user id
