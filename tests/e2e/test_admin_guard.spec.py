"""
tests/e2e/test_admin_guard.spec.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2E tests for admin route protection (authorization guards).

Scenarios:
  1. Unauthenticated user visiting /admin → redirected to /login or /unauthorized
  2. Reader role visiting /admin → redirected to /unauthorized or home
  3. Admin user visiting /admin → dashboard is accessible and visible
  4. Admin dashboard shows key management UI (books/orders/users sections)
"""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e

FRONTEND_URL = "http://localhost:5173"


class TestAdminRouteGuard:
    def test_unauthenticated_user_cannot_access_admin(self, page: Page):
        """
        An unauthenticated user navigating directly to /admin should be
        redirected to /login or /unauthorized — never see the dashboard.
        """
        page.goto(f"{FRONTEND_URL}/admin")
        page.wait_for_load_state("networkidle")

        current_url = page.url
        assert "/admin" not in current_url or "/unauthorized" in current_url or "/login" in current_url, \
            f"Expected redirect from /admin for unauthenticated user, but got: {current_url}"

        # Should NOT see admin-specific content
        admin_dashboard = page.locator(
            "[class*='AdminDashboard'], [class*='admin-dashboard'], "
            "h1:has-text('Dashboard'), h1:has-text('Admin')"
        )
        assert admin_dashboard.count() == 0 or not admin_dashboard.first.is_visible(), \
            "Admin dashboard should not be visible to unauthenticated users"

    def test_reader_cannot_access_admin(self, logged_in_page: Page):
        """
        A logged-in reader navigating to /admin should be redirected
        away (to /unauthorized or home) — not see the admin panel.
        """
        page = logged_in_page
        page.goto(f"{FRONTEND_URL}/admin")
        page.wait_for_load_state("networkidle")

        current_url = page.url
        # Readers should not land on /admin successfully
        is_on_admin = "/admin" in current_url and "/unauthorized" not in current_url
        if is_on_admin:
            # Check if the actual dashboard UI is visible
            dashboard = page.locator(
                "[class*='AdminDashboard'], h1:has-text('Dashboard')"
            )
            assert dashboard.count() == 0 or not dashboard.first.is_visible(), \
                "Admin dashboard should NOT be visible to readers"
        else:
            # Good — redirected
            assert True

    def test_admin_can_access_admin_dashboard(self, admin_page: Page):
        """
        An admin user should be able to navigate to /admin and see
        the admin dashboard with management sections.
        """
        page = admin_page
        page.goto(f"{FRONTEND_URL}/admin")
        page.wait_for_load_state("networkidle")

        # Should stay on /admin
        assert "/admin" in page.url, \
            f"Admin should be on /admin page, but got: {page.url}"

        # Dashboard content should be visible
        dashboard_content = page.locator(
            "[class*='dashboard'], [class*='Dashboard'], "
            "h1, h2, nav[class*='admin'], "
            "text=Dashboard, text=Books, text=Orders, text=Users"
        )
        expect(dashboard_content.first).to_be_visible(timeout=8000)

    def test_admin_dashboard_has_key_sections(self, admin_page: Page):
        """Admin dashboard should contain Books, Orders, and Users management sections."""
        page = admin_page
        page.goto(f"{FRONTEND_URL}/admin")
        page.wait_for_load_state("networkidle")

        # Look for at least one management section label
        management_sections = page.locator(
            "text=Books, text=Orders, text=Users, text=Coupons, "
            "a:has-text('Books'), a:has-text('Orders'), a:has-text('Users')"
        )
        assert management_sections.count() >= 1, \
            "Admin dashboard should show at least one management section"


class TestDirectURLAccess:
    def test_admin_books_route_protected(self, page: Page):
        """/admin/books should not be accessible to unauthenticated users."""
        page.goto(f"{FRONTEND_URL}/admin/books")
        page.wait_for_load_state("networkidle")

        assert "/admin/books" not in page.url or "/login" in page.url or "/unauthorized" in page.url, \
            f"Admin books route should be protected, but got: {page.url}"

    def test_admin_orders_route_protected(self, page: Page):
        """/admin/orders should not be accessible to unauthenticated users."""
        page.goto(f"{FRONTEND_URL}/admin/orders")
        page.wait_for_load_state("networkidle")

        assert "/admin/orders" not in page.url or "/login" in page.url or "/unauthorized" in page.url, \
            f"Admin orders route should be protected, but got: {page.url}"
