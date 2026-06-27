"""
tests/api/test_books.py
━━━━━━━━━━━━━━━━━━━━━━
API integration tests for /api/books/* routes.

Covers:
  - GET  /api/books           (list, search, category filter)
  - GET  /api/books/:id       (found, not found)
  - POST /api/books           (admin success, reader forbidden, unauthenticated)
  - PUT  /api/books/:id       (admin can update)
  - DELETE /api/books/:id     (admin can delete, reader cannot)
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _book_payload(**overrides) -> dict:
    base = {
        "title": f"Test Book {uuid.uuid4().hex[:6]}",
        "author": "QA Author",
        "price": 199,
        "coverImage": "https://placehold.co/300x400",
        "description": "A detailed description for testing purposes.",
        "category": "Manga",
        "pages": 200,
        "stock": 30,
    }
    base.update(overrides)
    return base


# ─── Read (Public) ───────────────────────────────────────────────────────────

class TestGetBooks:
    async def test_get_all_books_returns_200(self, http_client: httpx.AsyncClient):
        """GET /api/books should return 200 and a list of books."""
        res = await http_client.get("/api/books")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["books"], list)
        assert "count" in data

    async def test_search_books_by_title(self, http_client: httpx.AsyncClient, sample_book: dict):
        """Search should return the book we created by its title."""
        title_fragment = sample_book["title"][:8]
        res = await http_client.get("/api/books", params={"search": title_fragment})
        assert res.status_code == 200
        books = res.json()["books"]
        assert any(b["_id"] == sample_book["_id"] for b in books), \
            f"Expected to find book '{sample_book['title']}' in search results"

    async def test_filter_books_by_category(self, http_client: httpx.AsyncClient, sample_book: dict):
        """Filtering by category should only return books in that category."""
        res = await http_client.get("/api/books", params={"category": sample_book["category"]})
        assert res.status_code == 200
        books = res.json()["books"]
        assert all(b["category"] == sample_book["category"] for b in books)

    async def test_get_book_by_id_success(self, http_client: httpx.AsyncClient, sample_book: dict):
        """GET /api/books/:id should return the correct book."""
        res = await http_client.get(f"/api/books/{sample_book['_id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["book"]["_id"] == sample_book["_id"]
        assert data["book"]["title"] == sample_book["title"]

    async def test_get_book_by_invalid_id(self, http_client: httpx.AsyncClient):
        """GET /api/books with an invalid ObjectId should return 404 or 500."""
        res = await http_client.get("/api/books/000000000000000000000000")
        assert res.status_code in (404, 500)

    async def test_get_book_by_nonexistent_id(self, http_client: httpx.AsyncClient):
        """A well-formed but non-existent ObjectId should return 404."""
        res = await http_client.get("/api/books/507f1f77bcf86cd799439011")
        assert res.status_code == 404


# ─── Create (Admin only) ─────────────────────────────────────────────────────

class TestCreateBook:
    async def test_create_book_as_admin_success(
        self, http_client: httpx.AsyncClient, admin_credentials: dict
    ):
        """Admin can create a book → 201 with book data returned."""
        headers = _auth_headers(admin_credentials["token"])
        res = await http_client.post("/api/books", json=_book_payload(), headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "_id" in data["book"]
        assert data["book"]["author"] == "QA Author"

    async def test_create_book_as_reader_forbidden(
        self, http_client: httpx.AsyncClient, registered_user: dict
    ):
        """A reader role should receive 403 when attempting to create a book."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.post("/api/books", json=_book_payload(), headers=headers)
        assert res.status_code == 403

    async def test_create_book_unauthenticated(self, http_client: httpx.AsyncClient):
        """No token → 401."""
        res = await http_client.post("/api/books", json=_book_payload())
        assert res.status_code == 401

    async def test_create_book_missing_title(
        self, http_client: httpx.AsyncClient, admin_credentials: dict
    ):
        """Missing required 'title' field triggers Mongoose validation → not 201."""
        headers = _auth_headers(admin_credentials["token"])
        payload = _book_payload()
        del payload["title"]
        res = await http_client.post("/api/books", json=payload, headers=headers)
        assert res.status_code in (400, 500)

    async def test_create_book_missing_price(
        self, http_client: httpx.AsyncClient, admin_credentials: dict
    ):
        """Missing required 'price' field triggers Mongoose validation → not 201."""
        headers = _auth_headers(admin_credentials["token"])
        payload = _book_payload()
        del payload["price"]
        res = await http_client.post("/api/books", json=payload, headers=headers)
        assert res.status_code in (400, 500)


# ─── Update (Admin only) ─────────────────────────────────────────────────────

class TestUpdateBook:
    async def test_update_book_as_admin(
        self, http_client: httpx.AsyncClient, sample_book: dict, admin_credentials: dict
    ):
        """Admin can update a book's fields."""
        headers = _auth_headers(admin_credentials["token"])
        new_title = f"Updated Title {uuid.uuid4().hex[:4]}"
        res = await http_client.put(
            f"/api/books/{sample_book['_id']}",
            json={"title": new_title, "price": 499},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["book"]["title"] == new_title
        assert data["book"]["price"] == 499

    async def test_update_book_as_reader_forbidden(
        self, http_client: httpx.AsyncClient, sample_book: dict, registered_user: dict
    ):
        """Reader cannot update a book → 403."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.put(
            f"/api/books/{sample_book['_id']}",
            json={"price": 1},
            headers=headers,
        )
        assert res.status_code == 403

    async def test_update_nonexistent_book(
        self, http_client: httpx.AsyncClient, admin_credentials: dict
    ):
        """Updating a non-existent book ID returns 404."""
        headers = _auth_headers(admin_credentials["token"])
        res = await http_client.put(
            "/api/books/507f1f77bcf86cd799439011",
            json={"price": 99},
            headers=headers,
        )
        assert res.status_code == 404


# ─── Delete (Admin only) ─────────────────────────────────────────────────────

class TestDeleteBook:
    async def test_delete_book_as_admin(
        self, http_client: httpx.AsyncClient, admin_credentials: dict
    ):
        """Admin can delete a book they created."""
        headers = _auth_headers(admin_credentials["token"])
        # Create a throwaway book to delete
        create_res = await http_client.post("/api/books", json=_book_payload(), headers=headers)
        assert create_res.status_code == 201
        book_id = create_res.json()["book"]["_id"]

        delete_res = await http_client.delete(f"/api/books/{book_id}", headers=headers)
        assert delete_res.status_code == 200
        assert delete_res.json()["success"] is True

        # Verify it's gone
        get_res = await http_client.get(f"/api/books/{book_id}")
        assert get_res.status_code == 404

    async def test_delete_book_as_reader_forbidden(
        self, http_client: httpx.AsyncClient, sample_book: dict, registered_user: dict
    ):
        """Reader cannot delete a book → 403."""
        headers = _auth_headers(registered_user["token"])
        res = await http_client.delete(f"/api/books/{sample_book['_id']}", headers=headers)
        assert res.status_code == 403

    async def test_delete_book_unauthenticated(
        self, http_client: httpx.AsyncClient, sample_book: dict
    ):
        """No token → 401."""
        res = await http_client.delete(f"/api/books/{sample_book['_id']}")
        assert res.status_code == 401
