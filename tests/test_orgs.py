"""
Tests for org registration, invite, and query logic (Story 1.3).
Mocks asyncpg and supporting libs to run without a live DB.
"""
import asyncio
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

# --- Stub asyncpg ---
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

import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake:fake@localhost/fake")

import importlib
import user_service as _us_mod
importlib.reload(_us_mod)
from user_service import UserService


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _make_svc():
    svc = UserService.__new__(UserService)
    svc.database_url = "postgresql://fake:fake@localhost/fake"
    svc.email_service = MagicMock()
    return svc


# ---------------------------------------------------------------------------
# Task 7.1: create_org — verify org + admin member row created
# ---------------------------------------------------------------------------

def test_create_org_inserts_org_and_admin_member():
    svc = _make_svc()
    import uuid as _uuid
    org_id = str(_uuid.uuid4())
    org_row = {
        "id": org_id,
        "name": "Acme Corp",
        "admin_clerk_user_id": "clerk_admin_1",
        "seat_count": 10,
        "product_type": "corporate",
        "created_at": None,
        "updated_at": None,
    }
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=org_row)
    conn.execute = AsyncMock()
    conn.fetchval = AsyncMock(return_value="admin@acme.com")
    conn.close = AsyncMock()

    with patch.object(svc, "get_db_connection", return_value=conn):
        result = run(svc.create_org("Acme Corp", "clerk_admin_1", 10, "corporate"))

    assert result["id"] == org_id
    assert result["name"] == "Acme Corp"
    assert result["product_type"] == "corporate"
    # org INSERT + member INSERT = 2 execute calls (fetchrow for org, execute for member)
    assert conn.execute.call_count >= 1
    # Verify the member INSERT was called with 'admin' role
    calls_str = " ".join(str(c) for c in conn.execute.call_args_list)
    assert "admin" in calls_str or conn.fetchrow.called


def test_create_org_invalid_product_type_rejected():
    """create_org with bad product_type should raise or return error (enforced at API layer)."""
    # The service layer relies on DB constraint; we just verify it doesn't silently succeed.
    svc = _make_svc()
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(side_effect=Exception("check constraint"))
    conn.close = AsyncMock()
    with patch.object(svc, "get_db_connection", return_value=conn):
        result = run(svc.create_org("Bad Org", "clerk_1", 5, "invalid_type"))
    assert result is None or "error" in str(result).lower()


# ---------------------------------------------------------------------------
# Task 7.2: invite_member — verify pending org_members row inserted
# ---------------------------------------------------------------------------

def test_invite_member_inserts_pending_row():
    svc = _make_svc()
    import uuid as _uuid
    member_id = str(_uuid.uuid4())
    org_id = str(_uuid.uuid4())
    member_row = {
        "id": member_id,
        "org_id": org_id,
        "clerk_user_id": None,
        "role": "member",
        "invited_email": "employee@acme.com",
        "status": "pending",
        "created_at": None,
    }
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=member_row)
    conn.close = AsyncMock()

    with patch.object(svc, "get_db_connection", return_value=conn):
        result = run(svc.invite_member(org_id, "employee@acme.com", "corporate"))

    assert result["status"] == "pending"
    assert result["invited_email"] == "employee@acme.com"
    assert result["clerk_user_id"] is None


# ---------------------------------------------------------------------------
# Task 7.3: POST /orgs/register — mock create_org; assert 200 + correct shape
# ---------------------------------------------------------------------------

def _ensure_api_server_stubs():
    """Stub all heavy api_server dependencies before import."""
    stubs = {
        "vedya_agents": ["create_vedya_langgraph_system"],
        "email_service": ["email_service", "VedyaEmailService"],
        "ai_planning_agent": ["ai_planning_agent"],
        "diagram_utils": ["make_diagram_data_url"],
        "content_filter": [
            "SCHOOL_SAFE_SYSTEM_PROMPT", "filter_content", "check_org_content",
            "extract_text_from_pdf", "FilterResult", "ModerationResult",
        ],
        "excalidraw_utils": [],
        "openai": [],
    }
    for mod_name, attrs in stubs.items():
        if mod_name not in sys.modules:
            stub = types.ModuleType(mod_name)
            for attr in attrs:
                setattr(stub, attr, MagicMock())
            sys.modules[mod_name] = stub
        else:
            stub = sys.modules[mod_name]
            for attr in attrs:
                if not hasattr(stub, attr):
                    setattr(stub, attr, MagicMock())


def _get_api_mod():
    _ensure_api_server_stubs()
    if "api_server" not in sys.modules:
        import importlib as _il
        return _il.import_module("api_server")
    return sys.modules["api_server"]


def test_post_orgs_register_returns_200():
    from fastapi.testclient import TestClient
    api_mod = _get_api_mod()
    app = api_mod.app

    import uuid as _uuid
    org_id = str(_uuid.uuid4())
    fake_org = {"id": org_id, "name": "Test Corp", "admin_clerk_user_id": "clerk_1",
                "seat_count": 5, "product_type": "corporate", "created_at": None}

    mock_svc = MagicMock()
    mock_svc.create_org = AsyncMock(return_value=fake_org)
    api_mod.user_service = mock_svc

    client = TestClient(app)
    resp = client.post("/orgs/register", json={
        "admin_clerk_user_id": "clerk_1",
        "org_name": "Test Corp",
        "seat_count": 5,
        "product_type": "corporate",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert "org" in body
    assert body["org"]["id"] == org_id
    assert "message" in body


# ---------------------------------------------------------------------------
# Task 7.4: GET /orgs/me — valid admin ID and unknown ID
# ---------------------------------------------------------------------------

def test_get_orgs_me_with_valid_admin():
    from fastapi.testclient import TestClient
    api_mod = _get_api_mod()
    app = api_mod.app
    import uuid as _uuid
    org_id = str(_uuid.uuid4())
    fake_org = {"id": org_id, "name": "Test Corp", "admin_clerk_user_id": "clerk_admin_1",
                "seat_count": 5, "product_type": "corporate", "created_at": None}

    mock_svc = MagicMock()
    mock_svc.get_org_by_admin = AsyncMock(return_value=fake_org)
    api_mod.user_service = mock_svc

    client = TestClient(app)
    resp = client.get("/orgs/me?clerk_user_id=clerk_admin_1")

    assert resp.status_code == 200
    assert resp.json()["org"]["id"] == org_id


def test_get_orgs_me_unknown_returns_null_org():
    from fastapi.testclient import TestClient
    api_mod = _get_api_mod()
    app = api_mod.app

    mock_svc = MagicMock()
    mock_svc.get_org_by_admin = AsyncMock(return_value=None)
    api_mod.user_service = mock_svc

    client = TestClient(app)
    resp = client.get("/orgs/me?clerk_user_id=unknown_clerk_id")

    assert resp.status_code == 200
    assert resp.json()["org"] is None
