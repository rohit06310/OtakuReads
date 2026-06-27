"""
Testing/api/test_books.py

API integration tests for /api/books/* endpoints.

Covers:
  - GET  /api/books          (all, search, category filter)
  - GET  /api/books/:id      (found, not found)
  - POST /api/books          (admin success, reader 403, no auth 401)
  - PUT  /api/books/:id      (admin update, reader 403)
  - DELETE /api/books/:id    (admin delete, reader 403)
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api

_FAKE_ID = "000000000000000000000000"   # 24-char valid-looking but non-existent ObjectId


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _book_payload(title_suffix: str = "") -> dict:
    suffix = title_suffix or uuid.uuid4().hex[:6]
    return {
        "title":       f"QA Manga {suffix}",
        "author":      "QA Author",
        "price":       199,
        "coverImage":  "https://placehold.co/300x400",
        "description": "Created by the automated test suite.",
        "category":    "Manga",
        "pages":       120,
        "stock":       30,
    }


# ─── Public GET Endpoints ─────────────────────────────────────────────────────

class TestGetBooks:

    async def test_get_all_books_public(self, http_client: httpx.AsyncClient):
        """GET /api/books — no auth required, returns books array with count."""
        res = await http_client.get("/api/books")

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "books" in data
        assert "count" in data
        assert isinstance(data["books"], list)
        assert data["count"] == len(data["books"])

    async def test_get_books_filter_by_category(
        self,
        http_client:  httpx.AsyncClient,
        sample_book:  dict,           # ensures at least one Manga exists
    ):
        """?category=Manga → every returned book has category='Manga'."""
        res = await http_client.get("/api/books", params={"category": "Manga"})

        assert res.status_code == 200
        for book in res.json()["books"]:
            assert book["category"] == "Manga"

    async def test_get_books_search(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """?search=<exact title> → at least one result, title matches."""
        res = await http_client.get("/api/books", params={"search": sample_book["title"]})

        assert res.status_code == 200
        titles = [b["title"] for b in res.json()["books"]]
        assert any(sample_book["title"] in t for t in titles)

    async def test_get_book_by_id(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """GET /api/books/:id with valid ID → 200 + correct book data."""
        res = await http_client.get(f"/api/books/{sample_book['_id']}")

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["book"]["_id"] == sample_book["_id"]
        assert data["book"]["title"] == sample_book["title"]

    async def test_get_book_not_found(self, http_client: httpx.AsyncClient):
        """GET /api/books/<non-existent-id> → 404."""
        res = await http_client.get(f"/api/books/{_FAKE_ID}")
        assert res.status_code == 404


# ─── Admin CRUD ───────────────────────────────────────────────────────────────

class TestCreateBook:

    async def test_create_book_as_admin(
        self,
        http_client:        httpx.AsyncClient,
        admin_credentials:  dict,
    ):
        """Admin creates book → 201 + book object in response."""
        res = await http_client.post(
            "/api/books",
            json=_book_payload(),
            headers=_auth_header(admin_credentials["token"]),
        )

        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "_id" in data["book"]

    async def test_create_book_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Reader tries to create book → 403."""
        res = await http_client.post(
            "/api/books",
            json=_book_payload(),
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403

    async def test_create_book_without_auth(self, http_client: httpx.AsyncClient):
        """No token → 401."""
        res = await http_client.post("/api/books", json=_book_payload())
        assert res.status_code == 401


class TestUpdateBook:

    async def test_update_book_as_admin(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
        sample_book:       dict,
    ):
        """Admin updates book price → 200 + updated price reflected."""
        new_price = 999
        res = await http_client.put(
            f"/api/books/{sample_book['_id']}",
            json={"price": new_price},
            headers=_auth_header(admin_credentials["token"]),
        )

        assert res.status_code == 200
        assert res.json()["book"]["price"] == new_price

    async def test_update_book_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Reader update → 403."""
        res = await http_client.put(
            f"/api/books/{sample_book['_id']}",
            json={"price": 1},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403


class TestDeleteBook:

    async def test_delete_book_as_admin(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """Admin creates a book then deletes it; subsequent GET → 404."""
        # Create a dedicated book to delete
        create_res = await http_client.post(
            "/api/books",
            json=_book_payload("DELETE_ME"),
            headers=_auth_header(admin_credentials["token"]),
        )
        assert create_res.status_code == 201
        book_id = create_res.json()["book"]["_id"]

        # Delete
        del_res = await http_client.delete(
            f"/api/books/{book_id}",
            headers=_auth_header(admin_credentials["token"]),
        )
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # Confirm gone
        get_res = await http_client.get(f"/api/books/{book_id}")
        assert get_res.status_code == 404

    async def test_delete_book_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Reader delete → 403."""
        res = await http_client.delete(
            f"/api/books/{sample_book['_id']}",
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403

    async def test_delete_book_without_auth(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """No token → 401."""
        res = await http_client.delete(f"/api/books/{sample_book['_id']}")
        assert res.status_code == 401
