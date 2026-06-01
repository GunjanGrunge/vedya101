#!/usr/bin/env python3
"""
content_filter.py — VEDYA Content Safety & Moderation Module (Epic 5)

Provides age-appropriate content filtering for School product and
automated moderation checks for org-uploaded content.
"""

import asyncio
import io
import logging
from dataclasses import dataclass, field
from typing import List

import openai

# ---------------------------------------------------------------------------
# Module-level logger (no PII in log messages)
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCHOOL_SAFE_SYSTEM_PROMPT = (
    "You are teaching students aged 12-18. "
    "Keep all content age-appropriate. "
    "Avoid: violence, sexual content, drug references, political extremism."
)

# Hard-flagging OpenAI moderation categories (always → 'flagged' risk level)
_HARD_FLAG_CATEGORIES = {
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
    "sexual",
    "sexual/minors",
    "violence",
    "violence/graphic",
}

# Soft-flagging categories — medium risk when score < 0.7, flagged when >= 0.7
_SOFT_FLAG_CATEGORIES = {
    "harassment",
    "harassment/threatening",
}

# School-product categories that trigger block
_SCHOOL_BLOCK_CATEGORIES = {
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
    "sexual",
    "sexual/minors",
    "violence",
    "violence/graphic",
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class FilterResult:
    """Result of a content filter check for School AI responses."""
    safe: bool
    flagged_categories: List[str] = field(default_factory=list)
    filtered_text: str = ""


@dataclass
class ModerationResult:
    """Result of an automated moderation check for org-uploaded content."""
    risk_level: str   # 'low' | 'medium' | 'flagged'
    flagged_categories: List[str] = field(default_factory=list)
    notes: str = ""


# ---------------------------------------------------------------------------
# Story 5.1: School AI content filter
# ---------------------------------------------------------------------------

async def filter_content(text: str, product_type: str, content_filter_enabled: bool = True) -> FilterResult:
    """
    Filter AI-generated text for age-appropriateness.

    Args:
        text: The AI-generated response text to filter.
        product_type: 'school' | 'corporate' | 'vocational'
        content_filter_enabled: If False, skip moderation and return safe result.

    Returns:
        FilterResult with safe flag, flagged categories, and filtered text.
    """
    if not content_filter_enabled:
        return FilterResult(safe=True, flagged_categories=[], filtered_text=text)

    try:
        response = await asyncio.to_thread(
            openai.moderations.create,
            input=text,
        )
        result = response.results[0]

        # Build a flat dict of category name → flagged bool
        categories_dict = result.categories.__dict__ if hasattr(result.categories, "__dict__") else {}
        flagged_cats = [k for k, v in categories_dict.items() if v]

        if product_type == "school":
            school_flags = [c for c in flagged_cats if c in _SCHOOL_BLOCK_CATEGORIES]
            if school_flags:
                logger.warning(
                    "Content flagged for school product | categories=%s",
                    school_flags,
                )
                return FilterResult(safe=False, flagged_categories=school_flags, filtered_text="")
        else:
            # For non-school products, still respect the top-level 'flagged' field
            if result.flagged:
                logger.warning(
                    "Content flagged (non-school) | categories=%s",
                    flagged_cats,
                )
                return FilterResult(safe=False, flagged_categories=flagged_cats, filtered_text="")

        return FilterResult(safe=True, flagged_categories=[], filtered_text=text)

    except Exception as exc:
        logger.error("filter_content error: %s", exc)
        # Fail open (safe=True) so a moderation API outage does not block learners
        return FilterResult(safe=True, flagged_categories=[], filtered_text=text)


# ---------------------------------------------------------------------------
# Story 5.2: Org content automated moderation
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract plain text from PDF bytes using PyPDF2.

    Returns up to 10,000 characters. Returns empty string on failure.
    """
    try:
        import PyPDF2  # type: ignore

        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = " ".join(page.extract_text() or "" for page in reader.pages)
        if len(text) > 10_000:
            logger.info("PDF text truncated to 10,000 chars for moderation")
            text = text[:10_000]
        return text
    except Exception as exc:
        logger.warning("PDF text extraction failed: %s", exc)
        return ""


async def check_org_content(text: str) -> ModerationResult:
    """
    Run automated moderation check on org-uploaded content text.

    Risk-level mapping:
      - No flags → 'low'
      - Soft flags (harassment/threatening) with score < 0.7 → 'medium'
      - Hard flags OR any score >= 0.7 → 'flagged'

    Args:
        text: Plain text to moderate (max 10,000 chars recommended).

    Returns:
        ModerationResult with risk_level, flagged_categories, and notes.
    """
    if not text or not text.strip():
        return ModerationResult(risk_level="low", flagged_categories=[], notes="No text to moderate.")

    # Truncate if oversized
    if len(text) > 10_000:
        logger.info("check_org_content: text truncated to 10,000 chars")
        text = text[:10_000]

    try:
        response = await asyncio.to_thread(
            openai.moderations.create,
            input=text,
        )
        result = response.results[0]

        categories_dict = result.categories.__dict__ if hasattr(result.categories, "__dict__") else {}
        scores_dict = result.category_scores.__dict__ if hasattr(result.category_scores, "__dict__") else {}

        flagged_cats = [k for k, v in categories_dict.items() if v]
        high_score_cats = [k for k, v in scores_dict.items() if v >= 0.7]

        # Determine risk level
        hard_flags = [c for c in flagged_cats if c in _HARD_FLAG_CATEGORIES]
        if hard_flags or high_score_cats:
            risk_level = "flagged"
            noted_cats = list(set(hard_flags + high_score_cats))
        elif flagged_cats:
            # Soft flags only, all below 0.7
            risk_level = "medium"
            noted_cats = flagged_cats
        else:
            risk_level = "low"
            noted_cats = []

        notes = (
            f"Risk: {risk_level}. Flagged categories: {', '.join(noted_cats)}"
            if noted_cats
            else f"Risk: {risk_level}. No categories flagged."
        )

        logger.info("check_org_content result: risk=%s categories=%s", risk_level, noted_cats)
        return ModerationResult(risk_level=risk_level, flagged_categories=noted_cats, notes=notes)

    except Exception as exc:
        logger.error("check_org_content error: %s", exc)
        # Fail safe → treat as medium risk so content goes into manual review
        return ModerationResult(
            risk_level="medium",
            flagged_categories=[],
            notes=f"Moderation API error: {exc}",
        )
