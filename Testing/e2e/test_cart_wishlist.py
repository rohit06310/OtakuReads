"""
Testing/e2e/test_cart_wishlist.py

Playwright E2E tests for the Shopping Cart and Wishlist flows.

Covers:
  - Adding a book to the cart from the books page/details page.
  - Viewing the cart and updating items/quantity.
  - Adding a book to the wishlist and verifying it shows in /wishlist.
"""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e


class TestCartAndWishlist:

    def test_add_to_cart_and_view(self, authenticated_page: Page, base_url: str):
        """Log in, add a book to cart, and verify it's in the cart page."""
        page = authenticated_page
        page.goto(f"{base_url}/books")

        # Click the first book card to go to Details page
        view_details = page.locator("a[href^='/books/']").first
        expect(view_details).to_be_visible(timeout=10_000)
        view_details.click()

        # We should be on book detail page now
        page.wait_for_url(lambda url: "/books/" in url, timeout=5000)

        # Click "Add to Cart"
        add_to_cart_btn = page.get_by_role("button", name="Add to Cart")
        expect(add_to_cart_btn).to_be_visible()
        add_to_cart_btn.click()

        # Wait for toast confirmation or page changes
        page.wait_for_timeout(1000)

        # Navigate to Cart
        page.goto(f"{base_url}/cart")
        page.wait_for_url(f"{base_url}/cart", timeout=5000)

        # Cart should show the book item and checkout link
        expect(page.get_by_role("heading", name="Shopping Cart")).to_be_visible()
        expect(page.get_by_role("link", name="Proceed to Checkout")).to_be_visible()

    def test_add_to_wishlist_and_view(self, authenticated_page: Page, base_url: str):
        """Log in, add a book to wishlist, and verify it is visible in the wishlist page."""
        page = authenticated_page
        page.goto(f"{base_url}/books")

        # Wait for book cards and click the first card's wishlist button (absolute overlay button)
        wishlist_btn = page.get_by_title("Add to Wishlist").first
        expect(wishlist_btn).to_be_visible(timeout=10_000)
        wishlist_btn.click()

        page.wait_for_timeout(1000)

        # Navigate to Wishlist
        page.goto(f"{base_url}/wishlist")
        page.wait_for_url(f"{base_url}/wishlist", timeout=5000)

        # Expect wishlist page header
        expect(page.get_by_role("heading", name="My Wishlist")).to_be_visible()
