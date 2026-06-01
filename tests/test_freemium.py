"""
Tests for freemium limit logic in UserService (Story 1.1).
Mocks asyncpg and email_service at import level to avoid missing deps.
"""
import asyncio
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

# --- Stub asyncpg so user_service can be imported without the real library ---
_asyncpg_stub = types.ModuleType("asyncpg")
_asyncpg_stub.connect = AsyncMock()
sys.modules.setdefault("asyncpg", _asyncpg_stub)

# --- Stub dotenv ---
_dotenv_stub = types.ModuleType("dotenv")
_dotenv_stub.load_dotenv = lambda: None
sys.modules.setdefault("dotenv", _dotenv_stub)

# --- Stub email_service ---
_email_stub = types.ModuleType("email_service")
_email_stub.VedyaEmailService = MagicMock()
sys.modules.setdefault("email_service", _email_stub)

import importlib
import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake:fake@localhost/fake")

# Now import the module under test
import importlib
import user_service as _us_mod
importlib.reload(_us_mod)

from user_service import (  # noqa: E402
    UserService,
    FREEMIUM_SESSION_HOURS_LIMIT,
    FREEMIUM_SUBJECT_LIMIT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_svc():
    svc = UserService.__new__(UserService)
    svc.database_url = "postgresql://fake:fake@localhost/fake"
    svc.email_service = MagicMock()
    return svc


def _mock_conn(row):
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=row)
    conn.close = AsyncMock()
    return conn


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# check_freemium_limits
# ---------------------------------------------------------------------------

def test_freemium_under_limit():
    svc = _make_svc()
    row = {"subscription_tier": "freemium", "session_hours_used": 1.0, "subjects_accessed": ["Math"]}
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(row)):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["can_start_session"] is True
    assert r["can_access_subject"] is True
    assert r["tier"] == "freemium"
    assert r["session_hours_limit"] == FREEMIUM_SESSION_HOURS_LIMIT


def test_freemium_at_session_limit():
    svc = _make_svc()
    row = {"subscription_tier": "freemium", "session_hours_used": float(FREEMIUM_SESSION_HOURS_LIMIT), "subjects_accessed": []}
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(row)):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["can_start_session"] is False


def test_freemium_over_session_limit():
    svc = _make_svc()
    row = {"subscription_tier": "freemium", "session_hours_used": FREEMIUM_SESSION_HOURS_LIMIT + 2.0, "subjects_accessed": []}
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(row)):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["can_start_session"] is False


def test_freemium_at_subject_limit():
    svc = _make_svc()
    subjects = [f"subject_{i}" for i in range(FREEMIUM_SUBJECT_LIMIT)]
    row = {"subscription_tier": "freemium", "session_hours_used": 0.5, "subjects_accessed": subjects}
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(row)):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["can_access_subject"] is False


def test_paid_tier_no_limits():
    svc = _make_svc()
    row = {"subscription_tier": "paid", "session_hours_used": 999.0, "subjects_accessed": ["A", "B", "C", "D"]}
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(row)):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["tier"] == "paid"
    assert r["can_start_session"] is True
    assert r["can_access_subject"] is True
    assert r["session_hours_limit"] is None


def test_user_not_found_defaults_freemium():
    svc = _make_svc()
    with patch.object(svc, "get_db_connection", return_value=_mock_conn(None)):
        r = run(svc.check_freemium_limits("unknown"))
    assert r["tier"] == "freemium"
    assert r["can_start_session"] is True


def test_db_error_fails_open():
    svc = _make_svc()
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(side_effect=Exception("DB down"))
    conn.close = AsyncMock()
    with patch.object(svc, "get_db_connection", return_value=conn):
        r = run(svc.check_freemium_limits("user_abc"))
    assert r["can_start_session"] is True  # fail open — never block on error


def test_record_session_end_success():
    svc = _make_svc()
    conn = AsyncMock()
    conn.execute = AsyncMock()
    conn.close = AsyncMock()
    with patch.object(svc, "get_db_connection", return_value=conn):
        result = run(svc.record_session_end("user_abc", 1.5))
    assert result is True
    conn.execute.assert_called_once()
    assert "session_hours_used" in conn.execute.call_args[0][0]
