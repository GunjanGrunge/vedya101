"""Generate inline SVG diagram placeholders as data URLs (no external image service)."""
import base64
from xml.sax.saxutils import escape


def _hex_from_color_spec(spec: str) -> str:
    """Return hex color without the /FFFFFF part if present."""
    if "/" in spec:
        return spec.split("/")[0].strip()
    return spec.strip()


def make_diagram_data_url(
    concept: str,
    subject: str,
    subtitle: str = "Educational Diagram",
    bg_hex: str = "4F46E5",
) -> str:
    """
    Build an inline SVG image as a data URL for teaching diagrams.
    Works offline and does not depend on any external placeholder service.
    """
    bg = _hex_from_color_spec(bg_hex)
    c = escape(concept.replace("_", " ").strip() or "Concept")
    s = escape(subject.strip() or "Subject")
    t = escape(subtitle.strip() or "Educational Diagram")

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#{bg}"/>
  <text x="400" y="260" text-anchor="middle" fill="white" font-family="system-ui,Arial,sans-serif" font-size="36" font-weight="bold">{c}</text>
  <text x="400" y="320" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-family="system-ui,Arial,sans-serif" font-size="24">{s}</text>
  <text x="400" y="380" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui,Arial,sans-serif" font-size="20">{t}</text>
</svg>'''
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"
