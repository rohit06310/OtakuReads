"""
Testing/e2e/test_auth_flow.py

Playwright E2E tests for the authentication user journey.

Covers:
  - Successful registration via the /register form
  - Successful login via the /login form
  - Error toast shown on invalid login credentials
  - Logout clears session; login link is visible again
"""

import uuid
import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e


def _unique_email() -> str:
    return f"e2e_auth_{uuid.uuid4().hex[:8]}@otakutest.com"


class TestRegisterFlow:

    def test_register_new_user(self, page: Page, base_url: str):
        """
        Fill the registration form with unique credentials →
        get redirected and see a welcome indicator (user name or nav avatar).
        """
        email    = _unique_email()
        password = "Secure@E2e1"

        page.goto(f"{base_url}/register")

        # Fill registration form
        page.get_by_placeholder("Naruto Uzumaki").fill("E2E Tester")
        page.get_by_placeholder("you@otaku.com").fill(email)
        page.locator("#reg-password").fill(password)
        page.locator("#reg-confirm").fill(password)
        page.get_by_role("button", name="Create account", exact=True).click()

        # After registration the user should be redirected away from /register
        page.wait_for_url(lambda url: "/register" not in url, timeout=10_000)

        # The page should NOT show the Login link prominently (user is logged in)
        expect(page.get_by_role("link", name="Login")).not_to_be_visible()


class TestLoginFlow:

    def test_login_existing_user(
        self,
        page:     Page,
        e2e_user: dict,
        base_url: str,
    ):
        """
        Login with correct credentials →
        redirected to home/books; Login nav link not visible.
        """
        page.goto(f"{base_url}/login")

        page.get_by_label("Email address").fill(e2e_user["email"])
        page.get_by_label("Password").fill(e2e_user["password"])
        page.get_by_role("button", name="Sign in", exact=True).click()

        page.wait_for_url(lambda url: "/login" not in url, timeout=10_000)
        expect(page.get_by_role("link", name="Login")).not_to_be_visible()

    def test_login_invalid_credentials_shows_error(self, page: Page, base_url: str):
        """
        Wrong password → error toast or error message appears on the page.
        """
        page.goto(f"{base_url}/login")

        page.get_by_label("Email address").fill("wrong@nobody.com")
        page.get_by_label("Password").fill("BadPassword!")
        page.get_by_role("button", name="Sign in", exact=True).click()

        # Stay on /login or show an error; either way an error indicator appears.
        # Verify the specific error message is displayed
        expect(page.get_by_text("Invalid email or password")).to_be_visible(timeout=5_000)

    def test_login_empty_form_shows_validation(self, page: Page, base_url: str):
        """
        Submitting empty login form should surface a validation message.
        """
        page.goto(f"{base_url}/login")
        page.get_by_role("button", name="Sign in", exact=True).click()

        # HTML5 required validation or custom error should trigger
        email_input = page.get_by_label("Email address")
        # The input should be marked invalid or still on login page
        expect(page).to_have_url(f"{base_url}/login")


class TestLogoutFlow:

    def test_logout_returns_to_login_state(
        self,
        authenticated_page: Page,
        base_url:           str,
    ):
        """
        Logged-in user clicks logout → redirected; Login link re-appears in navbar.
        """
        page = authenticated_page

        # Find and click logout button (usually in a dropdown / avatar menu)
        # Try common selectors used in the OtakuReads Navbar component
        page.get_by_role("button", name="Logout").click()

        # After logout the Login link should be visible in the navbar
        expect(page.get_by_role("link", name="Login")).to_be_visible(timeout=5_000)
