"""
Cloudflare R2 storage primitives (S3-compatible via boto3).
Shared between main.py (API process) and worker.py (ARQ worker process).

Graceful degradation: if R2 env vars are absent, all functions log a warning
and return None/no-op. The calling code must handle None returns.
"""
import json
import logging
import os
from typing import Optional

logger = logging.getLogger("indxr-storage")

_R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
_R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
_R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")

_r2: Optional[object] = None
_r2_unavailable = False


def r2_client():
    """
    Lazy-init singleton boto3 S3 client for Cloudflare R2.
    Returns None when env vars are absent — callers must guard against None.
    """
    global _r2, _r2_unavailable
    if _r2_unavailable:
        return None
    if _r2 is not None:
        return _r2
    if not (_R2_ACCOUNT_ID and _R2_ACCESS_KEY_ID and _R2_SECRET_ACCESS_KEY):
        logger.warning(
            "R2 env vars missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) "
            "— R2 storage disabled, running without object cache"
        )
        _r2_unavailable = True
        return None
    try:
        import boto3
        _r2 = boto3.client(
            "s3",
            endpoint_url=f"https://{_R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=_R2_ACCESS_KEY_ID,
            aws_secret_access_key=_R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
        logger.info("R2 client initialised")
        return _r2
    except Exception as e:
        logger.warning(f"R2 client init failed: {e} — running without object cache")
        _r2_unavailable = True
        return None


def r2_write_json(bucket: str, key: str, data) -> None:
    """Upload a JSON-serialisable value to R2. No-op if R2 is unavailable."""
    client = r2_client()
    if client is None:
        return
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="application/json")


def r2_read_json(bucket: str, key: str) -> Optional[dict]:
    """Fetch and parse JSON from R2. Returns None on 404 or if R2 is unavailable."""
    client = r2_client()
    if client is None:
        return None
    try:
        resp = client.get_object(Bucket=bucket, Key=key)
        return json.loads(resp["Body"].read())
    except client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        from botocore.exceptions import ClientError
        if isinstance(e, ClientError) and e.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise


def r2_generate_presigned_url(bucket: str, key: str, expires_in: int = 3600) -> Optional[str]:
    """Generate a pre-signed GET URL for R2. Returns None if R2 is unavailable."""
    client = r2_client()
    if client is None:
        return None
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )
