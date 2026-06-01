"""
Tests for session lifecycle (Story 1.2).
Tests the POST /users/session-end endpoint:
 - known user_id clears the user_sessions dict
 - unknown user_id returns 200 (idempotent, no error)
"""
import asyncio
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

# --- Stub heavy deps before any imports ---
_asyncpg_stub = types.ModuleType("asyncpg")
_asyncpg_stub.connect = AsyncMock()
sys.modules.setdefault("asyncpg", _asyncpg_stub)

_dotenv_stub = types.ModuleType("dotenv")
_dotenv_stub.load_dotenv = lambda: None
sys.modules.setdefault("dotenv", _dotenv_stub)

_email_stub = types.ModuleType("email_service")
_email_stub.VedyaEmailService = MagicMock()
_email_mock_instance = MagicMock()
_email_mock_instance.notifications_enabled = False
_email_mock_instance.daily_summary_enabled = False
_email_mock_instance.progress_alerts_enabled = False
_email_mock_instance.weekly_report_enabled = False
_email_mock_instance.smtp_username = None
_email_mock_instance.smtp_password = None
_email_stub.email_service = _email_mock_instance
# Always set (not setdefault) so we override any partial stub from other test modules
sys.modules["email_service"] = _email_stub

import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake:fake@localhost/fake")
os.environ.setdefault("OPENAI_API_KEY", "sk-fake")

# Stub heavy optional deps so api_server can import without them
for _mod in [
    "openai",
    "vedya_agents",
    "ai_planning_agent",
    "diagram_utils",
    "streaming_utils",
    "conversational_agent",
    "conversational_chat",
]:
    if _mod not in sys.modules:
        _stub = types.ModuleType(_mod)
        sys.modules[_mod] = _stub

# Provide create_vedya_langgraph_system stub
sys.modules["vedya_agents"].create_vedya_langgraph_system = MagicMock(return_value=None)
# Provide ai_planning_agent stub
_pa = MagicMock()
_pa.process_message = AsyncMock(return_value={"response": "ok", "session_id": "s1", "plan_ready": False})
_pa.get_learning_plan = MagicMock(return_value=None)
sys.modules["ai_planning_agent"].ai_planning_agent = _pa
# Provide diagram_utils stub
sys.modules["diagram_utils"].make_diagram_data_url = MagicMock(return_value=None)
# Stub openai module attributes used in api_server
_openai_stub = sys.modules["openai"]
_openai_stub.OpenAI = MagicMock()

import importlib
import user_service as _us_mod
importlib.reload(_us_mod)

# Now import api_server (it will use the stubs above)
import api_server as _api_mod
importlib.reload(_api_mod)

from httpx import AsyncClient, ASGITransport
from api_server import app, user_sessions


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _make_mock_user_service():
    svc = MagicMock()
    svc.record_session_end = AsyncMock(return_value=True)
    svc.get_user_by_clerk_id = AsyncMock(return_value=None)
    return svc


# ---------------------------------------------------------------------------
# Test 7.1: POST /users/session-end clears a known clerk_user_id
# ---------------------------------------------------------------------------

def test_session_end_clears_known_user():
    known_id = "user_test_known_123"
    user_sessions[known_id] = {"some": "ephemeral_data"}

    async def _run():
        mock_svc = _make_mock_user_service()
        _api_mod.user_service = mock_svc
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/users/session-end",
                json={"clerk_user_id": known_id, "duration_hours": 0.0}
            )
        return resp

    resp = run(_run())
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert known_id not in user_sessions


# ---------------------------------------------------------------------------
# Test 7.2: POST /users/session-end with unknown clerk_user_id returns 200
# ---------------------------------------------------------------------------

def test_session_end_unknown_user_returns_200():
    unknown_id = "user_completely_unknown_xyz"
    # Ensure it's not in the dict
    user_sessions.pop(unknown_id, None)

    async def _run():
        mock_svc = _make_mock_user_service()
        _api_mod.user_service = mock_svc
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/users/session-end",
                json={"clerk_user_id": unknown_id, "duration_hours": 0.0}
            )
        return resp

    resp = run(_run())
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    # Still not in dict — no error raised
    assert unknown_id not in user_sessions
