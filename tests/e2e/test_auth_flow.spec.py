"""
tests/e2e/test_auth_flow.spec.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2E tests for authentication user journeys.

Scenarios:
  1. Successful registration → user lands on home page (not on /register)
  2. Login with wrong password → error message is visible
  3. Login success → user-specific UI element visible (name/avatar/logout)
  4. Logout → user is redirected away from protected area
"""

import uuid
import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e

FRONTEND_URL = "http://localhost:5173"


def _unique_email() -> str:
    return f"e2e_auth_{uuid.uuid4().hex[:8]}@otakutest.com"


class TestRegistrationFlow:
    def test_successful_registration_redirects_away_from_register(self, page: Page):
        """
        After a successful registration the user should NOT remain on /register.
        They should be redirected to home or a post-registration page.
        """
        page.goto(f"{FRONTEND_URL}/register")
        page.wait_for_load_state("networkidle")

        email = _unique_email()
        page.locator("input[name='name'], #name, input[placeholder*='name' i]").fill("New E2E User")
        page.locator("input[type='email'], #email").fill(email)
        pw_fields = page.locator("input[type='password']")
        pw_fields.first.fill("Secure@Pass123")
        if pw_fields.count() > 1:
            pw_fields.nth(1).fill("Secure@Pass123")

        page.locator("button[type='submit']").click()
        page.wait_for_load_state("networkidle")

        # Should no longer be on the register page
        assert "/register" not in page.url, \
            f"Expected redirect after registration, but still on: {page.url}"

    def test_register_with_existing_email_shows_error(self, page: Page, e2e_user_credentials: dict):
        """Registering with an already-used email should display an error message."""
        creds = e2e_user_credentials

        # First registration (may already be done — that's fine)
        page.goto(f"{FRONTEND_URL}/register")
        page.wait_for_load_state("networkidle")

        page.locator("input[name='name'], #name, input[placeholder*='name' i]").fill("Dup User")
        page.locator("input[type='email'], #email").fill(creds["email"])
        pw_fields = page.locator("input[type='password']")
        pw_fields.first.fill(creds["password"])
        if pw_fields.count() > 1:
            pw_fields.nth(1).fill(creds["password"])

        page.locator("button[type='submit']").click()
        page.wait_for_load_state("networkidle")

        # An error toast / error message should be visible somewhere on the page
        error_locator = page.locator(
            "text=already exists, "
            "[class*='error'], [class*='alert'], [role='alert'], "
            ".toast, .notification"
        )
        expect(error_locator.first).to_be_visible(timeout=5000)


class TestLoginFlow:
    def test_login_with_wrong_password_shows_error(self, page: Page, e2e_user_credentials: dict):
        """Wrong credentials should display an error — not log the user in."""
        creds = e2e_user_credentials
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_load_state("networkidle")

        page.locator("input[type='email'], #email").fill(creds["email"])
        page.locator("input[type='password']").fill("ThisIsWrong@999")
        page.locator("button[type='submit']").click()
        page.wait_for_load_state("networkidle")

        # Should still be on login (or show error)
        is_on_login = "/login" in page.url
        error_visible = page.locator(
            "[class*='error'], [role='alert'], .toast, text=Invalid"
        ).count() > 0
        assert is_on_login or error_visible, \
            "Expected to stay on /login or see an error message after wrong password"

    def test_login_success_shows_user_content(self, page: Page, logged_in_page: Page):
        """After login, the page should show user-specific content (avatar/name/logout)."""
        # logged_in_page fixture already logged us in
        user_indicator = page.locator(
            "button:has-text('Logout'), "
            "[class*='avatar'], "
            "[class*='user'], "
            "text=Profile, "
            "button:has-text('Sign Out'), "
            "a[href*='/profile']"
        )
        expect(user_indicator.first).to_be_visible(timeout=8000)

    def test_login_with_empty_fields_shows_validation(self, page: Page):
        """Submitting empty login form should not proceed."""
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_load_state("networkidle")

        page.locator("button[type='submit']").click()
        page.wait_for_load_state("networkidle")

        # Should remain on login page
        assert "/login" in page.url or page.url == f"{FRONTEND_URL}/"


class TestLogoutFlow:
    def test_logout_removes_auth_state(self, logged_in_page: Page):
        """Logging out should redirect the user away from protected pages."""
        page = logged_in_page

        # Find and click logout
        logout_btn = page.locator(
            "button:has-text('Logout'), "
            "button:has-text('Sign Out'), "
            "a:has-text('Logout'), "
            "a:has-text('Sign Out')"
        )
        if logout_btn.count() == 0:
            pytest.skip("Could not find logout button — UI selector may need updating")

        logout_btn.first.click()
        page.wait_for_load_state("networkidle")

        # After logout, navigating to /profile should redirect to /login
        page.goto(f"{FRONTEND_URL}/profile")
        page.wait_for_load_state("networkidle")
        assert "/login" in page.url or page.url == f"{FRONTEND_URL}/", \
            f"Expected redirect to login after logout, got: {page.url}"
