"""
Testing/e2e/conftest.py — Playwright fixtures for E2E tests.

Provides:
  - `page`               : standard per-test Playwright page (from pytest-playwright)
  - `authenticated_page` : page where a test reader is already logged in
  - `admin_page`         : page where the admin user is logged in

The browser used defaults to Chromium. Run with --browser firefox or
--browser webkit to switch.
"""

import os
import uuid
import pytest
import httpx
from playwright.sync_api import Page, BrowserContext


BACKEND_URL  = os.environ.get("BACKEND_URL",  "http://localhost:5000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _unique_email(prefix: str = "e2e") -> str:
    return f"e2e_{prefix}_{uuid.uuid4().hex[:8]}@otakutest.com"


def _register_user(name: str, email: str, password: str) -> dict:
    """Registers a user via the API and returns {name, email, password, token}."""
    with httpx.Client(base_url=BACKEND_URL, timeout=15.0) as client:
        res = client.post("/api/auth/register", json={
            "name": name, "email": email, "password": password,
        })
        if res.status_code not in (200, 201):
            raise RuntimeError(f"E2E user registration failed: {res.text}")
        return {"name": name, "email": email, "password": password,
                "token": res.json()["token"]}


def _login_via_ui(page: Page, email: str, password: str, base_url: str) -> None:
    """Navigates to /login and fills the form."""
    page.goto(f"{base_url}/login")
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    # Wait for redirect away from /login
    page.wait_for_url(lambda url: "/login" not in url, timeout=10_000)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def base_url() -> str:
    return FRONTEND_URL


@pytest.fixture
def e2e_user(base_url: str) -> dict:
    """
    Registers a fresh reader user via the API (fast) and returns their creds.
    Scope is function so each test gets an isolated user.
    """
    email    = _unique_email("reader")
    password = "E2ePass@123"
    return _register_user("E2E Reader", email, password)


@pytest.fixture
def authenticated_page(page: Page, e2e_user: dict, base_url: str) -> Page:
    """
    Returns a Playwright Page that is already logged in as a reader.
    Login is done through the UI login form.
    """
    _login_via_ui(page, e2e_user["email"], e2e_user["password"], base_url)
    return page


@pytest.fixture(scope="session")
def admin_user() -> dict:
    """
    Returns admin credentials (reads ADMIN_EMAIL/ADMIN_PASSWORD env vars).
    Falls back to the pre-seeded admin or registration.
    """
    email    = os.environ.get("ADMIN_EMAIL", "admin@otakureads.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if not email:
        # Attempt to register as admin (only works on fresh DB)
        email = _unique_email("admin")
        with httpx.Client(base_url=BACKEND_URL, timeout=15.0) as client:
            res = client.post("/api/auth/register", json={
                "name": "E2E Admin", "email": email, "password": password,
            })
            assert res.status_code == 201, f"Admin registration failed: {res.text}"
    return {"email": email, "password": password}


@pytest.fixture
def admin_page(page: Page, admin_user: dict, base_url: str) -> Page:
    """Returns a Playwright Page logged in as admin."""
    _login_via_ui(page, admin_user["email"], admin_user["password"], base_url)
    return page
