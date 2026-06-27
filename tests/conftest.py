"""
Root conftest.py — shared fixtures for all tests.
Provides base URLs (read from env vars so CI can override them) and
a shared async httpx client that every API test reuses.
"""

import os
import pytest
import httpx


# ─── Configuration ───────────────────────────────────────────────────────────

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


@pytest.fixture(scope="session")
def backend_url() -> str:
    """Base URL of the running OtakuReads backend."""
    return BACKEND_URL


@pytest.fixture(scope="session")
def frontend_url() -> str:
    """Base URL of the running OtakuReads frontend."""
    return FRONTEND_URL


@pytest.fixture(scope="session")
async def http_client(backend_url: str):
    """
    Shared async httpx client for the whole test session.
    base_url is set so every request only needs a relative path like '/api/auth/login'.
    """
    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        yield client
