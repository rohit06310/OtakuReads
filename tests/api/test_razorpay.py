"""
tests/api/test_razorpay.py
━━━━━━━━━━━━━━━━━━━━━━━━━
Tests for Razorpay payment verification logic.

Key design decision:
  - We do NOT call the real Razorpay API (no real money, no network dep).
  - We test the /api/verify-payment endpoint directly:
      PASS case: generate the correct HMAC-SHA256 signature locally,
                 send it → backend should accept it (200).
      FAIL case: send a tampered signature → backend must reject it (400).

  The RAZORPAY_KEY_SECRET must match what the running backend uses.
  Set RAZORPAY_KEY_SECRET env var before running these tests, or they
  will use the default test secret 'test_secret_key'.
"""

import hmac
import hashlib
import os
import pytest
import httpx

pytestmark = pytest.mark.api

RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "test_secret_key")


def _generate_signature(order_id: str, payment_id: str, secret: str) -> str:
    """Generates the HMAC-SHA256 signature exactly as Razorpay does."""
    message = f"{order_id}|{payment_id}"
    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ─── Verify Payment ──────────────────────────────────────────────────────────

class TestVerifyPayment:
    async def test_valid_signature_accepted(self, http_client: httpx.AsyncClient):
        """
        A correctly generated HMAC-SHA256 signature should be verified as
        authentic (200 success) by the backend.
        """
        order_id = "order_test_ABC123"
        payment_id = "pay_test_XYZ789"
        valid_sig = _generate_signature(order_id, payment_id, RAZORPAY_KEY_SECRET)

        res = await http_client.post("/api/verify-payment", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_sig,
        })

        # If Razorpay is not configured the endpoint returns 503 — skip gracefully
        if res.status_code == 503:
            pytest.skip("Razorpay not configured on this backend — skipping signature test")

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "verified" in data.get("message", "").lower()

    async def test_tampered_signature_rejected(self, http_client: httpx.AsyncClient):
        """
        A signature that doesn't match the expected HMAC must be rejected (400).
        This is critical: prevents anyone from forging payment confirmations.
        """
        res = await http_client.post("/api/verify-payment", json={
            "razorpay_order_id": "order_test_ABC123",
            "razorpay_payment_id": "pay_test_XYZ789",
            "razorpay_signature": "this_is_a_completely_fake_tampered_signature",
        })

        if res.status_code == 503:
            pytest.skip("Razorpay not configured on this backend — skipping signature test")

        assert res.status_code == 400
        data = res.json()
        assert data["success"] is False
        assert "failed" in data.get("error", "").lower() or \
               "invalid" in data.get("error", "").lower()

    async def test_mismatched_order_id_rejected(self, http_client: httpx.AsyncClient):
        """
        Generating a signature for order_A but sending order_B's ID must fail.
        Tests that the backend ties signature to the correct order.
        """
        order_id_real = "order_real_001"
        order_id_fake = "order_fake_999"
        payment_id = "pay_test_001"

        # Signature is valid for order_id_real, NOT order_id_fake
        sig = _generate_signature(order_id_real, payment_id, RAZORPAY_KEY_SECRET)

        res = await http_client.post("/api/verify-payment", json={
            "razorpay_order_id": order_id_fake,   # different order!
            "razorpay_payment_id": payment_id,
            "razorpay_signature": sig,
        })

        if res.status_code == 503:
            pytest.skip("Razorpay not configured on this backend — skipping signature test")

        assert res.status_code == 400

    async def test_missing_signature_field(self, http_client: httpx.AsyncClient):
        """Request missing the signature field should not verify successfully."""
        res = await http_client.post("/api/verify-payment", json={
            "razorpay_order_id": "order_test_ABC123",
            "razorpay_payment_id": "pay_test_XYZ789",
            # razorpay_signature is intentionally missing
        })

        if res.status_code == 503:
            pytest.skip("Razorpay not configured on this backend — skipping signature test")

        # Without a signature it should fail verification (400) or error (500)
        assert res.status_code in (400, 500)
        assert res.json()["success"] is False

    async def test_empty_body_does_not_crash_server(self, http_client: httpx.AsyncClient):
        """Sending an empty body should return an error but not crash the server."""
        res = await http_client.post("/api/verify-payment", json={})

        if res.status_code == 503:
            pytest.skip("Razorpay not configured on this backend — skipping signature test")

        assert res.status_code in (400, 500)
        # Most importantly: we get a JSON response, not a 502 server crash
        assert res.headers.get("content-type", "").startswith("application/json")
