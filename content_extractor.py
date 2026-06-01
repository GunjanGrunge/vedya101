#!/usr/bin/env python3
"""
Content Extractor (Story 3.4)
Extracts text from org-uploaded content stored in S3.
Supports PDF, DOCX, TXT/SOP, and video (metadata only).
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class ContentExtractionError(Exception):
    """Raised when content cannot be extracted from a file."""
    pass


def extract_text_from_content(s3_key: str, file_type: str, file_name: str = "") -> str:
    """
    Download file from S3 and extract readable text.

    Args:
        s3_key: S3 object key for the file.
        file_type: One of 'pdf', 'docx', 'txt', 'sop', 'manual', 'video'.
        file_name: Original filename (used for video placeholder).

    Returns:
        Extracted text string. May be truncated by caller.

    Raises:
        ContentExtractionError: If the file cannot be read or parsed.
    """
    from s3_utils import download_file_from_s3

    # --- Video: return lightweight metadata placeholder ---
    if file_type == "video":
        name = file_name or os.path.basename(s3_key)
        return f"Video content: {name}. Manual review recommended."

    # --- Download bytes from S3 ---
    try:
        file_bytes = download_file_from_s3(s3_key)
    except Exception as e:
        raise ContentExtractionError(f"Failed to download {s3_key} from S3: {e}") from e

    # --- Dispatch by type ---
    if file_type == "pdf":
        return _extract_pdf(file_bytes, s3_key)
    elif file_type == "docx":
        return _extract_docx(file_bytes, s3_key)
    elif file_type in ("txt", "sop", "manual"):
        return _extract_text(file_bytes, s3_key)
    else:
        # Unknown type: try raw UTF-8
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise ContentExtractionError(f"Cannot extract text from file type '{file_type}': {e}") from e


def _extract_pdf(file_bytes: bytes, s3_key: str) -> str:
    """Extract text from PDF bytes using pypdf."""
    try:
        import io
        try:
            from pypdf import PdfReader  # preferred maintained fork
        except ImportError:
            try:
                from PyPDF2 import PdfReader  # legacy fallback
            except ImportError:
                raise ContentExtractionError(
                    "pypdf is required for PDF extraction. Install it: pip install pypdf"
                )

        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
                pages_text.append(text)
            except Exception as page_err:
                logger.warning(f"Could not extract page from {s3_key}: {page_err}")
        extracted = "\n".join(pages_text).strip()
        if not extracted:
            logger.warning(f"PDF at {s3_key} yielded no text (may be scanned/image-only)")
            return f"[PDF content from {os.path.basename(s3_key)}: no extractable text found — may be a scanned document]"
        return extracted
    except ContentExtractionError:
        raise
    except Exception as e:
        logger.error(f"PDF extraction failed for {s3_key}: {e}")
        raise ContentExtractionError(f"PDF extraction failed: {e}") from e


def _extract_docx(file_bytes: bytes, s3_key: str) -> str:
    """Extract text from DOCX bytes using python-docx."""
    try:
        import io
        try:
            import docx
        except ImportError:
            raise ContentExtractionError(
                "python-docx is required for DOCX extraction. Install it: pip install python-docx"
            )

        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        extracted = "\n".join(paragraphs).strip()
        if not extracted:
            return f"[DOCX content from {os.path.basename(s3_key)}: no text paragraphs found]"
        return extracted
    except ContentExtractionError:
        raise
    except Exception as e:
        logger.error(f"DOCX extraction failed for {s3_key}: {e}")
        raise ContentExtractionError(f"DOCX extraction failed: {e}") from e


def _extract_text(file_bytes: bytes, s3_key: str) -> str:
    """Decode TXT/SOP/manual bytes as UTF-8."""
    try:
        return file_bytes.decode("utf-8", errors="replace").strip()
    except Exception as e:
        logger.error(f"Text extraction failed for {s3_key}: {e}")
        raise ContentExtractionError(f"Text extraction failed: {e}") from e
