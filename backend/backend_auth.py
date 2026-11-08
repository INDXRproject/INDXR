"""Shared backend-secret dependency, extracted from main.py so other modules (oauth_server.py) can
reuse it without importing main.py (which would be circular — main.py imports those modules)."""
import os

from fastapi import Request, Header, HTTPException

_BACKEND_API_SECRET = os.getenv("BACKEND_API_SECRET", "")


async def verify_backend_secret(request: Request, x_backend_secret: str = Header(default="")):
    """Reject requests that lack the shared backend secret.

    Exception: direct browser uploads send a Supabase JWT (Authorization: Bearer).
    Their auth is validated inside the endpoint body — backend-secret check is skipped here.
    """
    if request.headers.get("Authorization", "").startswith("Bearer "):
        return  # JWT-authenticated upload — validated in endpoint body
    if _BACKEND_API_SECRET and x_backend_secret != _BACKEND_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid backend secret")
