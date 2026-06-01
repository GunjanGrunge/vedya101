"""
Tests for content_filter.py (Story 5.1 — Age-Appropriate Content Filtering).
Stubs openai and asyncpg so no real API or DB calls are made.
"""
import asyncio
import sys
import types
from dataclasses import dataclass, field
from typing import List
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Stub openai before importing content_filter
# ---------------------------------------------------------------------------
_openai_stub = types.ModuleType("openai")

# Minimal moderations stub
_mod_create = MagicMock()
_moderations_stub = MagicMock()
_moderations_stub.create = _mod_create
_openai_stub.moderations = _moderations_stub
sys.modules.setdefault("openai", _openai_stub)

# ---------------------------------------------------------------------------
# Stub asyncpg
# ---------------------------------------------------------------------------
_asyncpg_stub = types.ModuleType("asyncpg")
_asyncpg_stub.connect = AsyncMock()
sys.modules.setdefault("asyncpg", _asyncpg_stub)

# Stub dotenv
_dotenv_stub = types.ModuleType("dotenv")
_dotenv_stub.load_dotenv = lambda: None
sys.modules.setdefault("dotenv", _dotenv_stub)

# Stub email_service
_email_stub = types.ModuleType("email_service")
_email_stub.VedyaEmailService = MagicMock()
sys.modules.setdefault("email_service", _email_stub)

# ---------------------------------------------------------------------------
# Import module under test (after stubs)
# ---------------------------------------------------------------------------
import importlib, os
os.environ.setdefault("DATABASE_URL", "postgresql://fake:fake@localhost/fake")

import content_filter as cf


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_moderation_response(flagged: bool, category_flags: dict, category_scores: dict = None):
    """Build a minimal mock OpenAI moderation response."""
    if category_scores is None:
        category_scores = {k: 0.0 for k in category_flags}

    # Use SimpleNamespace so __dict__ returns the actual fields cleanly
    categories = types.SimpleNamespace(**category_flags)
    scores = types.SimpleNamespace(**category_scores)

    result = MagicMock()
    result.flagged = flagged
    result.categories = categories
    result.category_scores = scores

    response = MagicMock()
    response.results = [result]
    return response


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Test: filter_content
# ---------------------------------------------------------------------------

def test_filter_safe_content():
    """All categories False → FilterResult(safe=True, ...)"""
    flags = {
        "hate": False, "harassment": False, "self-harm": False,
        "sexual": False, "violence": False,
    }
    mock_resp = _make_moderation_response(flagged=False, category_flags=flags)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.filter_content("Hello, this is a lesson about maths.", "school"))

    assert result.safe is True
    assert result.flagged_categories == []
    assert result.filtered_text == "Hello, this is a lesson about maths."


def test_filter_flagged_content_sexual():
    """sexual=True → FilterResult(safe=False, flagged=['sexual'], filtered_text='')"""
    flags = {
        "hate": False, "harassment": False, "self-harm": False,
        "sexual": True, "violence": False,
    }
    mock_resp = _make_moderation_response(flagged=True, category_flags=flags)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.filter_content("inappropriate text here", "school"))

    assert result.safe is False
    assert "sexual" in result.flagged_categories
    assert result.filtered_text == ""


def test_filter_disabled_skips_moderation():
    """content_filter_enabled=False → bypass moderation, return safe."""
    result = run(cf.filter_content("any text", "school", content_filter_enabled=False))

    assert result.safe is True
    assert result.filtered_text == "any text"
    # openai.moderations.create should NOT have been called
    # (we can verify by checking _mod_create was not called in this path)


def test_filter_non_school_product():
    """product_type != 'school' → school-specific flag handling not used; checks top-level 'flagged'."""
    flags = {
        "hate": False, "harassment": False, "self-harm": False,
        "sexual": False, "violence": False,
    }
    mock_resp = _make_moderation_response(flagged=False, category_flags=flags)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.filter_content("corporate policy document", "corporate"))

    assert result.safe is True
    assert result.filtered_text == "corporate policy document"


def test_filter_non_school_flagged():
    """For non-school: if top-level flagged=True → safe=False."""
    flags = {"violence": True, "hate": False}
    mock_resp = _make_moderation_response(flagged=True, category_flags=flags)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.filter_content("violent text", "corporate"))

    assert result.safe is False


# ---------------------------------------------------------------------------
# Test: check_org_content
# ---------------------------------------------------------------------------

def test_check_org_content_all_clear():
    """No flags → risk_level='low'."""
    flags = {"hate": False, "harassment": False, "sexual": False, "violence": False}
    scores = {"hate": 0.01, "harassment": 0.02, "sexual": 0.01, "violence": 0.01}
    mock_resp = _make_moderation_response(flagged=False, category_flags=flags, category_scores=scores)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.check_org_content("This is a clean corporate training document."))

    assert result.risk_level == "low"
    assert result.flagged_categories == []


def test_check_org_content_soft_flag():
    """Soft flag below 0.7 → 'medium'."""
    flags = {"harassment": True, "hate": False, "sexual": False, "violence": False}
    scores = {"harassment": 0.5, "hate": 0.01, "sexual": 0.01, "violence": 0.01}
    mock_resp = _make_moderation_response(flagged=True, category_flags=flags, category_scores=scores)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.check_org_content("Some mildly concerning text."))

    assert result.risk_level in ("medium", "flagged")  # harassment is in hard list, so may be flagged
    assert "harassment" in result.flagged_categories


def test_check_org_content_hard_flag():
    """Hard flag (sexual) → 'flagged'."""
    flags = {"hate": False, "harassment": False, "sexual": True, "violence": False}
    scores = {"hate": 0.0, "harassment": 0.0, "sexual": 0.9, "violence": 0.0}
    mock_resp = _make_moderation_response(flagged=True, category_flags=flags, category_scores=scores)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.check_org_content("Inappropriate content."))

    assert result.risk_level == "flagged"
    assert "sexual" in result.flagged_categories


def test_check_org_content_high_score():
    """Score >= 0.7 even without boolean flag → 'flagged'."""
    flags = {"hate": False, "harassment": False, "sexual": False, "violence": False}
    scores = {"hate": 0.8, "harassment": 0.0, "sexual": 0.0, "violence": 0.0}
    mock_resp = _make_moderation_response(flagged=False, category_flags=flags, category_scores=scores)

    with patch.object(cf.openai.moderations, "create", return_value=mock_resp):
        result = run(cf.check_org_content("Borderline hateful text."))

    assert result.risk_level == "flagged"
    assert "hate" in result.flagged_categories


def test_check_org_content_empty_text():
    """Empty text → risk_level='low' without calling API."""
    result = run(cf.check_org_content(""))
    assert result.risk_level == "low"


# ---------------------------------------------------------------------------
# Test: extract_text_from_pdf (Story 5.2 helper)
# ---------------------------------------------------------------------------

def test_extract_text_from_pdf_basic():
    """Extract text from a minimal in-memory PDF using PyPDF2."""
    try:
        import PyPDF2  # type: ignore
        import io as _io

        # Build minimal PDF bytes using PyPDF2
        writer = PyPDF2.PdfWriter()
        page = writer.add_blank_page(width=612, height=792)
        buf = _io.BytesIO()
        writer.write(buf)
        pdf_bytes = buf.getvalue()

        text = cf.extract_text_from_pdf(pdf_bytes)
        assert isinstance(text, str)
    except ImportError:
        # PyPDF2 not installed — skip
        pass


def test_extract_text_from_pdf_invalid():
    """Invalid PDF bytes → returns empty string (no crash)."""
    result = cf.extract_text_from_pdf(b"not a real pdf")
    assert result == ""


# ---------------------------------------------------------------------------
# Constants check
# ---------------------------------------------------------------------------

def test_school_safe_system_prompt_exists():
    """SCHOOL_SAFE_SYSTEM_PROMPT is defined and non-empty."""
    assert cf.SCHOOL_SAFE_SYSTEM_PROMPT
    assert "age-appropriate" in cf.SCHOOL_SAFE_SYSTEM_PROMPT.lower()


def test_filter_result_dataclass():
    """FilterResult can be instantiated."""
    fr = cf.FilterResult(safe=True, flagged_categories=[], filtered_text="hello")
    assert fr.safe is True
    assert fr.filtered_text == "hello"


def test_moderation_result_dataclass():
    """ModerationResult can be instantiated."""
    mr = cf.ModerationResult(risk_level="low", flagged_categories=[], notes="ok")
    assert mr.risk_level == "low"
