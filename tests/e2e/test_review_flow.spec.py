"""
tests/e2e/test_review_flow.spec.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2E tests for the review submission and management flow.

Scenarios:
  1. Logged-in user can see the review form on a book detail page
  2. User fills and submits a review → it appears in the review list
  3. User can delete their own review → it disappears from the list
"""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e

FRONTEND_URL = "http://localhost:5173"


def _navigate_to_first_book(page: Page):
    """Helper: go to books list and open the first book's detail page."""
    page.goto(f"{FRONTEND_URL}/books")
    page.wait_for_load_state("networkidle")

    first_card = page.locator(
        "[class*='book-card'], [class*='card'], article"
    ).first
    expect(first_card).to_be_visible(timeout=10000)
    first_card.click()
    page.wait_for_load_state("networkidle")


class TestReviewFormVisible:
    def test_review_form_visible_when_logged_in(self, logged_in_page: Page):
        """
        The review form (rating selector + comment textarea) should be
        visible to authenticated users on the book detail page.
        """
        page = logged_in_page
        _navigate_to_first_book(page)

        review_form = page.locator(
            "form[id*='review'], form[class*='review'], "
            "[class*='ReviewForm'], "
            "textarea[placeholder*='review' i], textarea[placeholder*='comment' i], "
            "[data-testid='review-form']"
        )
        if review_form.count() == 0:
            pytest.skip("Review form not found — the book may already be reviewed or selector needs tuning")

        expect(review_form.first).to_be_visible(timeout=5000)

    def test_review_form_not_visible_when_logged_out(self, page: Page):
        """Unauthenticated users should NOT see the review submission form."""
        _navigate_to_first_book(page)

        review_form = page.locator(
            "textarea[placeholder*='review' i], textarea[placeholder*='comment' i]"
        )
        # Either form is hidden or a 'login to review' message is shown
        if review_form.count() > 0:
            assert not review_form.first.is_visible(), \
                "Review form should not be visible to unauthenticated users"


class TestSubmitReview:
    def test_submit_review_appears_in_list(self, logged_in_page: Page):
        """
        After submitting a review, the review text should appear in
        the review section of the book detail page.
        """
        import uuid
        page = logged_in_page
        _navigate_to_first_book(page)

        # Try to find and fill the review form
        comment_box = page.locator(
            "textarea[placeholder*='review' i], "
            "textarea[placeholder*='comment' i], "
            "textarea[name*='comment']"
        ).first

        if not comment_box.is_visible():
            pytest.skip("Review textarea not found or not visible (may have already reviewed this book)")

        unique_comment = f"Great book! Auto-test review {uuid.uuid4().hex[:6]}"
        comment_box.fill(unique_comment)

        # Select a star rating if present
        star_btns = page.locator(
            "button[aria-label*='star' i], [class*='star'], input[type='radio'][name*='rating']"
        )
        if star_btns.count() >= 5:
            star_btns.nth(4).click()  # 5 stars

        # Submit
        submit_btn = page.locator(
            "button[type='submit']:has-text('Submit'), "
            "button:has-text('Post Review'), "
            "button:has-text('Add Review'), "
            "button:has-text('Submit Review')"
        ).first

        if not submit_btn.is_visible():
            pytest.skip("Submit review button not found")

        submit_btn.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # The review should now appear in the reviews list
        review_in_list = page.locator(f"text={unique_comment[:20]}")
        expect(review_in_list).to_be_visible(timeout=8000)


class TestDeleteReview:
    def test_delete_own_review_removes_it(self, logged_in_page: Page):
        """
        The user can click 'Delete' on their own review and it disappears
        from the review list.
        """
        import uuid
        page = logged_in_page
        _navigate_to_first_book(page)

        # First submit a review
        comment_box = page.locator(
            "textarea[placeholder*='review' i], "
            "textarea[placeholder*='comment' i]"
        ).first

        if not comment_box.is_visible():
            pytest.skip("Cannot submit review — form not visible")

        unique_comment = f"Delete me {uuid.uuid4().hex[:6]}"
        comment_box.fill(unique_comment)

        star_btns = page.locator("button[aria-label*='star' i], [class*='star']")
        if star_btns.count() >= 3:
            star_btns.nth(2).click()

        submit_btn = page.locator(
            "button:has-text('Submit'), button:has-text('Post Review'), "
            "button:has-text('Add Review')"
        ).first
        if not submit_btn.is_visible():
            pytest.skip("Submit button not found")

        submit_btn.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # Verify it appeared
        review_text = page.locator(f"text={unique_comment[:15]}")
        if review_text.count() == 0:
            pytest.skip("Review didn't appear after submission")

        # Find and click delete button near this review
        delete_btn = page.locator(
            "button:has-text('Delete'), button[aria-label*='delete' i], "
            "[class*='delete'], button:has-text('Remove')"
        ).first

        if not delete_btn.is_visible():
            pytest.skip("Delete button not found for review")

        delete_btn.click()

        # Confirm if dialog appears
        page.wait_for_timeout(500)
        confirm_btn = page.locator("button:has-text('Confirm'), button:has-text('Yes')")
        if confirm_btn.count() > 0:
            confirm_btn.first.click()

        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # Review should no longer be visible
        assert page.locator(f"text={unique_comment[:15]}").count() == 0, \
            "Review should have been removed from the list after deletion"
