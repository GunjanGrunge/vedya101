#!/usr/bin/env python3
"""
S3 Upload Utility (Story 3.3)
Handles file uploads to AWS S3 for org-uploaded content.
Credentials are read from environment variables:
  AWS_S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
"""

import os
import re
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Supported MIME types → internal file_type values
ALLOWED_MIME_TYPES: dict = {
    "application/pdf": "pdf",
    "video/mp4": "video",
    "video/quicktime": "video",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}

ALLOWED_EXTENSIONS: set = {".pdf", ".mp4", ".mov", ".docx", ".txt"}

MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB


def _get_boto3_client():
    """Create and return a boto3 S3 client using env credentials."""
    try:
        import boto3
        client = boto3.client(
            "s3",
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
        return client
    except ImportError:
        raise RuntimeError("boto3 is required for S3 uploads. Install it with: pip install boto3")


def sanitise_filename(filename: str) -> str:
    """Replace spaces with underscores and strip special chars, preserve extension."""
    # Split name and extension
    if "." in filename:
        name_part, ext_part = filename.rsplit(".", 1)
        ext_part = "." + ext_part
    else:
        name_part = filename
        ext_part = ""
    # Replace spaces and special chars in name
    safe_name = re.sub(r"[^\w\-]", "_", name_part)
    return safe_name + ext_part


def build_s3_key(org_id: str, original_filename: str) -> str:
    """Build S3 key: org-content/{org_id}/{uuid4_hex}/{sanitised_filename}"""
    safe_name = sanitise_filename(original_filename)
    unique_id = uuid.uuid4().hex
    return f"org-content/{org_id}/{unique_id}/{safe_name}"


def detect_file_type(content_type: Optional[str], filename: str) -> Optional[str]:
    """
    Validate content_type against ALLOWED_MIME_TYPES.
    Falls back to extension check if content_type is generic (application/octet-stream).
    Returns internal file_type string or None if unsupported.
    """
    lower_filename = filename.lower()

    # Direct MIME type match
    if content_type and content_type in ALLOWED_MIME_TYPES:
        return ALLOWED_MIME_TYPES[content_type]

    # Generic octet-stream: try extension-based detection
    if content_type in ("application/octet-stream", None):
        ext = _get_extension(lower_filename)
        if ext in ALLOWED_EXTENSIONS:
            # Heuristic: sop/manual from filename keywords
            if "sop" in lower_filename or "procedure" in lower_filename:
                return "sop"
            if "manual" in lower_filename:
                return "manual"
            ext_map = {
                ".pdf": "pdf",
                ".mp4": "video",
                ".mov": "video",
                ".docx": "docx",
                ".txt": "txt",
            }
            return ext_map.get(ext)

    return None  # Unsupported


def _get_extension(filename: str) -> str:
    """Return lowercase file extension including dot, e.g. '.pdf'."""
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def upload_file_to_s3(file_bytes: bytes, s3_key: str, content_type: str) -> str:
    """
    Upload bytes to S3 at the given key.
    Returns the s3_key on success.
    Raises RuntimeError on failure.
    """
    bucket = os.getenv("AWS_S3_BUCKET_NAME")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET_NAME environment variable is not set")

    client = _get_boto3_client()
    try:
        client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type or "application/octet-stream",
        )
        logger.info(f"Uploaded to S3: s3://{bucket}/{s3_key} ({len(file_bytes)} bytes)")
        return s3_key
    except Exception as e:
        logger.error(f"S3 upload failed for key {s3_key}: {e}")
        raise RuntimeError(f"S3 upload failed: {e}") from e


def download_file_from_s3(s3_key: str) -> bytes:
    """
    Download file bytes from S3 for the given key.
    Returns raw bytes. Raises RuntimeError on failure.
    """
    bucket = os.getenv("AWS_S3_BUCKET_NAME")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET_NAME environment variable is not set")

    client = _get_boto3_client()
    try:
        response = client.get_object(Bucket=bucket, Key=s3_key)
        data = response["Body"].read()
        logger.info(f"Downloaded from S3: s3://{bucket}/{s3_key} ({len(data)} bytes)")
        return data
    except Exception as e:
        logger.error(f"S3 download failed for key {s3_key}: {e}")
        raise RuntimeError(f"S3 download failed: {e}") from e
