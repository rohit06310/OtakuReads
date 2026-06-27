"""
Testing/e2e/test_auth_guards.py

Playwright E2E tests for route guards and role-based access control.

Covers:
  - Unauthorized visitors accessing /cart are redirected to /login.
  - Unauthorized visitors accessing /checkout are redirected to /login.
  - Standard readers accessing /admin are redirected to /unauthorized.
  - Admin users accessing /admin can see the Admin Dashboard.
"""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e


class TestAuthGuards:

    def test_cart_redirects_visitor(self, page: Page, base_url: str):
        """Visiting /cart without logging in redirects to /login."""
        page.goto(f"{base_url}/cart")
        # Route guards might redirect immediately to /login or /unauthorized
        page.wait_for_url(lambda url: "/login" in url or "/unauthorized" in url, timeout=10_000)
        assert "/login" in page.url or "/unauthorized" in page.url

    def test_checkout_redirects_visitor(self, page: Page, base_url: str):
        """Visiting /checkout without logging in redirects to /login."""
        page.goto(f"{base_url}/checkout")
        page.wait_for_url(lambda url: "/login" in url or "/unauthorized" in url, timeout=10_000)
        assert "/login" in page.url or "/unauthorized" in page.url

    def test_reader_access_admin_redirects_to_unauthorized(
        self,
        authenticated_page: Page,
        base_url:           str,
    ):
        """A standard logged-in reader visiting /admin gets redirected to /unauthorized."""
        page = authenticated_page
        page.goto(f"{base_url}/admin")

        page.wait_for_url(lambda url: "/unauthorized" in url, timeout=10_000)
        expect(page.get_by_role("heading", name="Access Forbidden")).to_be_visible()

    def test_admin_access_admin_dashboard(
        self,
        admin_page: Page,
        base_url:   str,
    ):
        """An admin user visiting /admin sees the Admin Dashboard."""
        page = admin_page
        page.goto(f"{base_url}/admin")

        page.wait_for_url(f"{base_url}/admin", timeout=10_000)
        # Verify dashboard headers or elements
        expect(page.get_by_role("heading", name="Admin Dashboard")).to_be_visible()
        expect(page.get_by_role("button", name="Books")).to_be_visible()
        expect(page.get_by_role("button", name="Orders")).to_be_visible()
        expect(page.get_by_role("button", name="Coupons")).to_be_visible()
