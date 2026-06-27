"""
tests/e2e/conftest.py
━━━━━━━━━━━━━━━━━━━━
Playwright fixtures for E2E browser tests.

pytest-playwright provides the `browser`, `context`, and `page` fixtures
automatically. We extend them here to add:
  - `base_url` configured from environment / pytest.ini
  - `logged_in_page` — a page already authenticated as a reader
  - `admin_page`     — a page already authenticated as an admin

Requirements:
  - Frontend must be running on http://localhost:5173
  - Backend must be running on http://localhost:5000
"""

import os
import uuid
import pytest
from playwright.sync_api import Page, BrowserContext, expect


FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _unique_email(prefix: str = "e2e") -> str:
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@otakutest.com"


def _register_and_login_via_ui(page: Page, email: str, password: str, name: str = "Test User"):
    """
    Registers a user via the UI registration form, then logs in.
    Returns after a successful login redirect.
    """
    page.goto(f"{FRONTEND_URL}/register")
    page.wait_for_load_state("networkidle")

    page.locator("input[name='name'], input[placeholder*='name' i], #name").fill(name)
    page.locator("input[name='email'], input[type='email'], #email").fill(email)
    page.locator("input[name='password'], input[type='password'], #password").first.fill(password)

    # Some forms have a confirm password field
    confirm_field = page.locator("input[name='confirmPassword'], input[placeholder*='confirm' i]")
    if confirm_field.count() > 0:
        confirm_field.fill(password)

    page.locator("button[type='submit']").click()
    page.wait_for_load_state("networkidle")


def _login_via_ui(page: Page, email: str, password: str):
    """Logs in through the UI login form."""
    page.goto(f"{FRONTEND_URL}/login")
    page.wait_for_load_state("networkidle")

    page.locator("input[name='email'], input[type='email'], #email").fill(email)
    page.locator("input[name='password'], input[type='password'], #password").fill(password)
    page.locator("button[type='submit']").click()
    page.wait_for_load_state("networkidle")


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def e2e_user_credentials() -> dict:
    """
    Session-scoped: one reader account used across all E2E tests.
    We generate the credentials here; actual registration happens in logged_in_page.
    """
    return {
        "name": "E2E Test User",
        "email": _unique_email("reader"),
        "password": "E2ePass@123",
    }


@pytest.fixture(scope="session")
def e2e_admin_credentials() -> dict:
    """Admin credentials — set ADMIN_EMAIL / ADMIN_PASSWORD env vars."""
    return {
        "email": os.environ.get("ADMIN_EMAIL", "admin@otakureads.com"),
        "password": os.environ.get("ADMIN_PASSWORD", "admin123"),
    }


@pytest.fixture
def logged_in_page(page: Page, e2e_user_credentials: dict) -> Page:
    """
    Returns a Playwright Page already logged in as a reader.
    Registers the user on first use (idempotent — server returns 400 if exists, we login anyway).
    """
    creds = e2e_user_credentials

    # Try register first (may fail if already registered — that's fine)
    try:
        _register_and_login_via_ui(page, creds["email"], creds["password"], creds["name"])
    except Exception:
        _login_via_ui(page, creds["email"], creds["password"])

    # If registration redirected to home, we're done. Otherwise login.
    if "/login" in page.url or "/register" in page.url:
        _login_via_ui(page, creds["email"], creds["password"])

    return page


@pytest.fixture
def admin_page(page: Page, e2e_admin_credentials: dict) -> Page:
    """Returns a Playwright Page logged in as admin."""
    creds = e2e_admin_credentials
    if not creds["email"]:
        pytest.skip("ADMIN_EMAIL env var not set — skipping admin E2E tests")
    _login_via_ui(page, creds["email"], creds["password"])
    return page
