#!/usr/bin/env python3
"""
Excalidraw Utils — generate Excalidraw-compatible element arrays via LLM.
Used by /teaching/generate-diagram when format='excalidraw'.
"""

import json
import uuid
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage


def _fallback_elements(concept: str) -> list:
    """Return a minimal single-rectangle diagram when LLM output is unparseable."""
    return [
        {
            "id": str(uuid.uuid4()),
            "type": "rectangle",
            "x": 200,
            "y": 200,
            "width": 400,
            "height": 80,
            "strokeColor": "#a78bfa",
            "backgroundColor": "#1e1a2e",
            "fillStyle": "solid",
            "opacity": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "type": "text",
            "x": 220,
            "y": 230,
            "width": 360,
            "height": 40,
            "strokeColor": "#f8f8f2",
            "backgroundColor": "transparent",
            "text": concept[:80],
            "fontSize": 18,
            "opacity": 1,
        },
    ]


async def generate_excalidraw_elements(
    concept: str,
    subject: str,
    diagram_type: str,
) -> list:
    """
    Call the Planner LLM to produce an Excalidraw-compatible elements array.

    Returns a list of element dicts on success.
    Falls back to a hardcoded minimal diagram if LLM output cannot be parsed.
    """
    # Import here to avoid circular import at module level
    try:
        from professional_planning import planning_agent  # noqa: WPS433
        llm = planning_agent.llm
    except Exception:
        return _fallback_elements(concept)

    system = SystemMessage(
        content=(
            "You are a diagram generator. Output ONLY valid JSON — a JSON array of Excalidraw elements. "
            "No markdown fences, no commentary, no trailing text. "
            "Use element types: rectangle, ellipse, arrow, text, diamond. "
            "Keep coordinates within an 800x600 viewport. "
            "Each element must have: id (unique string), type, x, y, width, height, "
            "strokeColor (hex), backgroundColor (hex or 'transparent'). "
            "Text elements also need: text (string), fontSize (number). "
            "Arrow elements also need: points ([[x1,y1],[x2,y2]]). "
            "Limit to 8-12 elements total."
        )
    )
    prompt = HumanMessage(
        content=(
            f"Generate an Excalidraw diagram for: {concept} (subject: {subject}, "
            f"diagram type: {diagram_type}). "
            "Use a dark-educational colour palette (purples, teals, whites on dark backgrounds). "
            "Return ONLY the JSON array."
        )
    )

    try:
        response = await llm.ainvoke([system, prompt])
        raw = response.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.splitlines()
            # Remove first and last fence lines
            inner = lines[1:-1] if lines[-1].startswith("```") else lines[1:]
            raw = "\n".join(inner).strip()

        elements = json.loads(raw)
        if not isinstance(elements, list) or len(elements) == 0:
            raise ValueError("LLM returned empty or non-list JSON")

        # Ensure each element has a unique id
        for el in elements:
            if not el.get("id"):
                el["id"] = str(uuid.uuid4())

        return elements
    except Exception as exc:
        print(f"⚠️ generate_excalidraw_elements fallback triggered: {exc}")
        return _fallback_elements(concept)
