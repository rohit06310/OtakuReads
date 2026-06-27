"""
Testing/api/test_reviews.py

API integration tests for /api/reviews/* endpoints.

Covers:
  - GET  /api/reviews/book/:id   (public, returns all reviews)
  - POST /api/reviews            (success, no auth, missing fields, duplicate)
  - DELETE /api/reviews/:id      (own review, other user blocked, admin can delete any)
"""

import pytest
import httpx

pytestmark = pytest.mark.api


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _review_payload(book_id: str) -> dict:
    return {
        "bookId":  book_id,
        "rating":  5,
        "title":   "Automated QA Review",
        "comment": "This review was created by the automated test suite.",
    }


# ─── Fetch Reviews ────────────────────────────────────────────────────────────

class TestGetReviews:

    async def test_get_book_reviews_public(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """GET /api/reviews/book/:id — no auth needed, returns reviews array."""
        res = await http_client.get(f"/api/reviews/book/{sample_book['_id']}")

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["reviews"], list)


# ─── Add Review ───────────────────────────────────────────────────────────────

class TestAddReview:

    async def test_add_review_success(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Authenticated user adds a review → 201 + review in response."""
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=_auth_header(registered_user["token"]),
        )

        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "review" in data
        assert data["review"]["rating"] == 5

    async def test_add_review_no_auth(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """No token → 401."""
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
        )
        assert res.status_code == 401

    async def test_add_review_missing_rating(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Missing rating field → 400."""
        res = await http_client.post(
            "/api/reviews",
            json={"bookId": sample_book["_id"], "comment": "No rating provided."},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_add_review_missing_comment(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Missing comment field → 400."""
        res = await http_client.post(
            "/api/reviews",
            json={"bookId": sample_book["_id"], "rating": 4},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_add_review_duplicate_blocked(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """
        The same user posting a second review on the same book → 400
        'You have already reviewed this book'.
        """
        payload = _review_payload(sample_book["_id"])
        headers = _auth_header(registered_user["token"])

        first = await http_client.post("/api/reviews", json=payload, headers=headers)
        # First review may or may not succeed depending on prior test state
        # — what matters is the SECOND call returns 400
        second = await http_client.post("/api/reviews", json=payload, headers=headers)
        assert second.status_code == 400


# ─── Delete Review ────────────────────────────────────────────────────────────

class TestDeleteReview:

    async def _create_review(
        self,
        http_client: httpx.AsyncClient,
        token:       str,
        book_id:     str,
    ) -> str:
        """Helper: posts a review and returns its _id."""
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload(book_id),
            headers=_auth_header(token),
        )
        # May be 201 (new) or 400 (duplicate). Either way, fetch the review id.
        if res.status_code == 201:
            return res.json()["review"]["_id"]
        # Fallback: fetch existing review for this user+book
        book_res = await http_client.get(
            f"/api/reviews/book/{book_id}",
            headers=_auth_header(token),
        )
        reviews = book_res.json()["reviews"]
        # Find the one belonging to this user (token decode not available here;
        # just return first available — good enough for delete tests)
        return reviews[0]["_id"]

    async def test_delete_own_review(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """User deletes their own review → 200."""
        review_id = await self._create_review(
            http_client, registered_user["token"], sample_book["_id"]
        )
        res = await http_client.delete(
            f"/api/reviews/{review_id}",
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

    async def test_delete_review_other_user_blocked(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,    # the reviewer
        sample_book:     dict,
        backend_url:     str,     # used to spin up a second user
    ):
        """
        A different authenticated user (not author, not admin) tries to delete
        someone else's review → 403.
        """
        import uuid, httpx as _httpx

        # Create the review as registered_user
        review_id = await self._create_review(
            http_client, registered_user["token"], sample_book["_id"]
        )

        # Register a second, unrelated user
        other_email = f"other_{uuid.uuid4().hex[:6]}@otakutest.com"
        async with _httpx.AsyncClient(base_url=backend_url, timeout=15.0) as c:
            reg = await c.post("/api/auth/register", json={
                "name": "Other User", "email": other_email, "password": "OtherPass@1",
            })
            assert reg.status_code == 201
            other_token = reg.json()["token"]

        # Try to delete with the OTHER user's token
        res = await http_client.delete(
            f"/api/reviews/{review_id}",
            headers=_auth_header(other_token),
        )
        assert res.status_code == 403

    async def test_admin_can_delete_any_review(
        self,
        http_client:       httpx.AsyncClient,
        registered_user:   dict,
        admin_credentials: dict,
        sample_book:       dict,
    ):
        """Admin can delete any review regardless of authorship → 200."""
        review_id = await self._create_review(
            http_client, registered_user["token"], sample_book["_id"]
        )
        res = await http_client.delete(
            f"/api/reviews/{review_id}",
            headers=_auth_header(admin_credentials["token"]),
        )
        assert res.status_code == 200

    async def test_delete_review_no_auth(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """No token → 401."""
        review_id = await self._create_review(
            http_client, registered_user["token"], sample_book["_id"]
        )
        res = await http_client.delete(f"/api/reviews/{review_id}")
        assert res.status_code == 401
