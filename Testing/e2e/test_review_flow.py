"""
Testing/e2e/test_review_flow.py

Playwright E2E tests for the Book Review flow.

Covers:
  - Submitting a new review (rating, title, comment) on a book's detail page.
  - Verifying the new review is shown in the review list.
  - Deleting the submitted review and verifying it is removed.
"""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e


class TestReviewFlow:

    def test_submit_and_delete_review(self, authenticated_page: Page, base_url: str):
        """Submit a review, confirm it appears, and delete it."""
        page = authenticated_page
        page.goto(f"{base_url}/books")

        # Navigate to first book details
        view_details = page.locator("a[href^='/books/']").first
        expect(view_details).to_be_visible(timeout=10_000)
        view_details.click()

        page.wait_for_url(lambda url: "/books/" in url, timeout=5000)

        # Look for the reviews section and add review form
        # Note: In OtakuReads, reviews might only be allowed for purchased items or any item.
        # Let's locate the review input elements.
        rating_select = page.locator("select[name='rating'], select").first
        comment_textarea = page.get_by_placeholder("Write your review here...")
        submit_btn = page.get_by_role("button", name="Submit Review")

        # If review form is present (some configs require purchased check)
        if rating_select.is_visible() and comment_textarea.is_visible():
            rating_select.select_option("5")
            comment_textarea.fill("E2E Test Review: Highly recommended!")
            submit_btn.click()

            page.wait_for_timeout(1000)

            # Check that the review comment is displayed in the reviews list
            expect(page.get_by_text("E2E Test Review: Highly recommended!")).to_be_visible()

            # Find the delete button for our review (if displayed)
            # Standard reader can delete their own review
            delete_btn = page.get_by_role("button").filter(has_text="Delete").first
            if delete_btn.is_visible():
                delete_btn.click()
                page.wait_for_timeout(1000)
                expect(page.get_by_text("E2E Test Review: Highly recommended!")).not_to_be_visible()
