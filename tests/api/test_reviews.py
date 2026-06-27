"""
tests/api/test_reviews.py
━━━━━━━━━━━━━━━━━━━━━━━━
API integration tests for /api/reviews/* routes.

Covers:
  - POST /api/reviews              (success, unauthenticated, duplicate, missing fields)
  - GET  /api/reviews/book/:id     (list reviews for a book)
  - DELETE /api/reviews/:id        (own review, other user's review → 403, admin override)
  - Verified purchase badge logic
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _review_payload(book_id: str, **overrides) -> dict:
    payload = {
        "bookId": book_id,
        "rating": 5,
        "title": "Great manga!",
        "comment": f"Really enjoyed this one. Test run {uuid.uuid4().hex[:4]}",
    }
    payload.update(overrides)
    return payload


# ─── Add Review ──────────────────────────────────────────────────────────────

class TestAddReview:
    async def test_add_review_success(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """Authenticated user can post a review for a book."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert data["review"]["rating"] == 5
        assert data["review"]["comment"] is not None
        # isVerifiedPurchase should be present (bool)
        assert isinstance(data["isVerifiedPurchase"], bool)

    async def test_add_review_unauthenticated(
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

    async def test_add_duplicate_review(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """
        A user cannot review the same book twice.
        The second attempt should return 400.
        """
        headers = _auth_headers(registered_user["token"])
        # First review
        first = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert first.status_code == 201

        # Second review on the same book
        second = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert second.status_code == 400
        msg = second.json().get("message", "") or second.json().get("error", "")
        assert "already reviewed" in msg.lower()

    async def test_add_review_missing_comment(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """Missing required 'comment' field → 400."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/reviews",
            json={"bookId": sample_book["_id"], "rating": 4},
            headers=headers,
        )
        assert res.status_code == 400

    async def test_add_review_nonexistent_book(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reviewing a non-existent book ID → 404."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload("507f1f77bcf86cd799439011"),
            headers=headers,
        )
        assert res.status_code == 404

    async def test_verified_purchase_flag_without_order(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """
        A user who has not purchased the book gets isVerifiedPurchase = False.
        (This test creates a fresh user who has no orders.)
        """
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert res.status_code == 201
        assert res.json()["isVerifiedPurchase"] is False

    async def test_verified_purchase_flag_with_order(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """
        A user who has purchased the book should get isVerifiedPurchase = True.
        """
        headers = _auth_headers(registered_user["token"])
        # Place an order first
        order_res = await http_client.post(
            "/api/orders",
            json={
                "items": [{"bookId": sample_book["_id"], "quantity": 1}],
                "total": sample_book["price"],
                "paymentId": "pay_vp_test",
                "orderId": "order_vp_test",
            },
            headers=headers,
        )
        assert order_res.status_code == 201

        # Now add review
        review_res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert review_res.status_code == 201
        assert review_res.json()["isVerifiedPurchase"] is True


# ─── Get Reviews ─────────────────────────────────────────────────────────────

class TestGetBookReviews:
    async def test_get_reviews_public_access(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """GET /api/reviews/book/:id is public and returns the review list."""
        # Post one review first
        headers = _auth_headers(registered_user["token"])
        await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )

        # Fetch without auth
        res = await http_client.get(f"/api/reviews/book/{sample_book['_id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["reviews"], list)

    async def test_get_reviews_includes_user_info(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """Each review in the response should include the user's name."""
        headers = _auth_headers(registered_user["token"])
        await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        res = await http_client.get(f"/api/reviews/book/{sample_book['_id']}")
        reviews = res.json()["reviews"]
        if reviews:
            assert "name" in reviews[0].get("user", {})


# ─── Delete Review ───────────────────────────────────────────────────────────

class TestDeleteReview:
    async def test_user_can_delete_own_review(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """A user can delete their own review."""
        headers = _auth_headers(registered_user["token"])
        # Post a review
        create_res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        assert create_res.status_code == 201
        review_id = create_res.json()["review"]["_id"]

        # Delete it
        del_res = await http_client.delete(f"/api/reviews/{review_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

    async def test_user_cannot_delete_other_users_review(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
        backend_url: str,
    ):
        """
        User A posts a review.
        User B (different account) cannot delete it → 403.
        """
        import uuid as _uuid
        # User A posts the review
        headers_a = _auth_headers(registered_user["token"])
        create_res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers_a,
        )
        assert create_res.status_code == 201
        review_id = create_res.json()["review"]["_id"]

        # Register and login as User B
        email_b = f"userb_{_uuid.uuid4().hex[:8]}@otakutest.com"
        async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as c:
            reg_b = await c.post("/api/auth/register", json={
                "name": "User B",
                "email": email_b,
                "password": "PassB@1234",
            })
            token_b = reg_b.json()["token"]

        headers_b = _auth_headers(token_b)
        del_res = await http_client.delete(f"/api/reviews/{review_id}", headers=headers_b)
        assert del_res.status_code == 403

    async def test_admin_can_delete_any_review(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        admin_credentials: dict,
        sample_book: dict,
    ):
        """Admin can delete any user's review."""
        user_headers = _auth_headers(registered_user["token"])
        admin_headers = _auth_headers(admin_credentials["token"])

        # User posts review
        create_res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=user_headers,
        )
        assert create_res.status_code == 201
        review_id = create_res.json()["review"]["_id"]

        # Admin deletes it
        del_res = await http_client.delete(f"/api/reviews/{review_id}", headers=admin_headers)
        assert del_res.status_code == 200

    async def test_delete_review_unauthenticated(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
        sample_book: dict,
    ):
        """No token → 401."""
        headers = _auth_headers(registered_user["token"])
        create_res = await http_client.post(
            "/api/reviews",
            json=_review_payload(sample_book["_id"]),
            headers=headers,
        )
        if create_res.status_code == 201:
            review_id = create_res.json()["review"]["_id"]
            del_res = await http_client.delete(f"/api/reviews/{review_id}")
            assert del_res.status_code == 401

    async def test_delete_nonexistent_review(
        self,
        http_client: httpx.AsyncClient,
        registered_user: dict,
    ):
        """Deleting a non-existent review ID → 404."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.delete(
            "/api/reviews/507f1f77bcf86cd799439011",
            headers=headers,
        )
        assert res.status_code == 404
