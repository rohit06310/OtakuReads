"""
Testing/conftest.py — root shared fixtures.

Provides:
  - backend_url  : base URL of the OtakuReads Express API
  - frontend_url : base URL of the React dev server
  - http_client  : session-scoped async httpx.AsyncClient

Override URLs via env vars (useful in CI):
  BACKEND_URL  = http://localhost:5000
  FRONTEND_URL = http://localhost:5173
"""

import os
import pytest
import httpx


# ─── Base URLs ────────────────────────────────────────────────────────────────

BACKEND_URL  = os.environ.get("BACKEND_URL",  "http://localhost:5000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def backend_url() -> str:
    """Base URL of the running OtakuReads backend."""
    return BACKEND_URL


@pytest.fixture(scope="session")
def frontend_url() -> str:
    """Base URL of the running OtakuReads frontend (Vite dev server)."""
    return FRONTEND_URL


@pytest.fixture
async def http_client(backend_url: str):
    """
    Function-scoped async httpx client.
    Creates a new client per test case, avoiding event loop conflicts.
    """
    async with httpx.AsyncClient(base_url=backend_url, timeout=15.0) as client:
        yield client

