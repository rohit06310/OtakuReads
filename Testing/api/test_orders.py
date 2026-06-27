"""
Testing/api/test_orders.py

API integration tests for /api/orders/* endpoints.

Covers:
  - POST /api/orders          (success, no auth, empty items, bad book id, stock deduction)
  - GET  /api/orders          (my orders — auth required)
  - GET  /api/orders/all      (admin only)
  - POST /api/orders with coupon (valid coupon accepted, expired coupon ignored)
"""

import uuid
import pytest
import httpx

pytestmark = pytest.mark.api

_FAKE_ID = "000000000000000000000000"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _order_payload(book_id: str, price: float, quantity: int = 1, **extras) -> dict:
    return {
        "items":     [{"bookId": book_id, "quantity": quantity}],
        "total":     price * quantity,
        "paymentId": f"pay_test_{uuid.uuid4().hex[:10]}",
        "orderId":   f"order_test_{uuid.uuid4().hex[:10]}",
        **extras,
    }


# ─── Create Order ─────────────────────────────────────────────────────────────

class TestCreateOrder:

    async def test_create_order_success(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
        sample_book:     dict,
    ):
        """Authenticated user places valid order → 201 + order in response."""
        res = await http_client.post(
            "/api/orders",
            json=_order_payload(sample_book["_id"], sample_book["price"]),
            headers=_auth_header(registered_user["token"]),
        )

        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert "order" in data
        assert data["order"]["status"] == "completed"

    async def test_create_order_no_auth(
        self,
        http_client: httpx.AsyncClient,
        sample_book: dict,
    ):
        """No token → 401."""
        res = await http_client.post(
            "/api/orders",
            json=_order_payload(sample_book["_id"], sample_book["price"]),
        )
        assert res.status_code == 401

    async def test_create_order_empty_items(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Empty items array → 400 'No order items'."""
        res = await http_client.post(
            "/api/orders",
            json={"items": [], "total": 0},
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 400

    async def test_create_order_invalid_book_id(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """Non-existent book ID → 404."""
        res = await http_client.post(
            "/api/orders",
            json=_order_payload(_FAKE_ID, 100),
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 404

    async def test_create_order_deducts_stock(
        self,
        http_client:       httpx.AsyncClient,
        registered_user:   dict,
        admin_credentials: dict,
        sample_book:       dict,
    ):
        """
        After placing an order for 1 copy, the book's stock should decrease by 1.
        """
        # Capture stock before order
        before_res = await http_client.get(f"/api/books/{sample_book['_id']}")
        stock_before = before_res.json()["book"]["stock"]

        # Place the order
        order_res = await http_client.post(
            "/api/orders",
            json=_order_payload(sample_book["_id"], sample_book["price"], quantity=1),
            headers=_auth_header(registered_user["token"]),
        )
        assert order_res.status_code == 201

        # Check stock after
        after_res = await http_client.get(f"/api/books/{sample_book['_id']}")
        stock_after = after_res.json()["book"]["stock"]

        assert stock_after == stock_before - 1

    async def test_create_order_with_valid_coupon(
        self,
        http_client:          httpx.AsyncClient,
        registered_user:      dict,
        admin_credentials:    dict,
        sample_book:          dict,
        sample_coupon_valid:  dict,
    ):
        """Order with valid 20% coupon → 201, order created (coupon applied server-side)."""
        payload = _order_payload(sample_book["_id"], sample_book["price"])
        payload["couponCode"] = sample_coupon_valid["code"]

        res = await http_client.post(
            "/api/orders",
            json=payload,
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 201

    async def test_create_order_with_expired_coupon(
        self,
        http_client:           httpx.AsyncClient,
        registered_user:       dict,
        sample_book:           dict,
        sample_coupon_expired: dict,
    ):
        """
        Order with expired coupon → still creates the order (backend ignores
        invalid coupon silently), response is 201.
        """
        payload = _order_payload(sample_book["_id"], sample_book["price"])
        payload["couponCode"] = sample_coupon_expired["code"]

        res = await http_client.post(
            "/api/orders",
            json=payload,
            headers=_auth_header(registered_user["token"]),
        )
        # Backend ignores invalid coupon and still completes the order
        assert res.status_code == 201


# ─── Fetch Orders ─────────────────────────────────────────────────────────────

class TestGetOrders:

    async def test_get_my_orders_authenticated(
        self,
        http_client:   httpx.AsyncClient,
        placed_order:  dict,
    ):
        """GET /api/orders for the user who placed placed_order → 200 + list."""
        token = placed_order["user"]["token"]
        res   = await http_client.get(
            "/api/orders",
            headers=_auth_header(token),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["orders"], list)
        assert len(data["orders"]) >= 1

    async def test_get_my_orders_no_auth(self, http_client: httpx.AsyncClient):
        """GET /api/orders without token → 401."""
        res = await http_client.get("/api/orders")
        assert res.status_code == 401

    async def test_get_all_orders_as_admin(
        self,
        http_client:       httpx.AsyncClient,
        admin_credentials: dict,
    ):
        """GET /api/orders/all as admin → 200 + orders list."""
        res = await http_client.get(
            "/api/orders/all",
            headers=_auth_header(admin_credentials["token"]),
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["orders"], list)

    async def test_get_all_orders_as_reader_is_forbidden(
        self,
        http_client:     httpx.AsyncClient,
        registered_user: dict,
    ):
        """GET /api/orders/all as reader → 403."""
        res = await http_client.get(
            "/api/orders/all",
            headers=_auth_header(registered_user["token"]),
        )
        assert res.status_code == 403
