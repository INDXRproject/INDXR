"""
Self-hosted OAuth 2.1 authorization server for the MCP connector (ADR-108, revised).

Replaces the abandoned approach of rewriting `aud`/`role` on Supabase-issued JWTs via a Custom
Access Token Hook — that failed the security gate because PostgREST/Storage/GoTrue don't enforce
`aud`, and RLS on `transcripts` keys off `auth.uid()` (the `sub` claim) regardless of `role`. This
server issues **opaque tokens** (random strings, stored only as a SHA-256 hash) that are never a
valid JWT, so Supabase's own APIs reject them outright — the isolation guarantee is a property of
the token's shape, not of configuration those services don't check.

Endpoints: DCR (`/oauth/register`), authorization-request creation + consent lookup/decision
(`/oauth/authorize/*`, called by Next.js — the browser never talks to this backend directly for the
authorize step), token issuance with PKCE + refresh rotation (`/oauth/token`), revocation
(`/oauth/revoke`). Metadata documents (RFC 8414 / RFC 9728) are served statically by Next.js, not
here. All DB access is service-role via `get_supabase_client()`.

Simplification (phase 1): no "remembered consent" — every `/oauth/authorize` shows the consent
screen again. An authorization_id is used exactly once through its lifecycle (create → show →
decide); re-fetching after a decision returns an error rather than reconstructing a redirect
(the raw code is never stored, only its hash, so it can't be regenerated after the fact).
"""
import base64
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote, urlparse

from fastapi import APIRouter, Depends, Form, Header, Request
from fastapi.responses import JSONResponse

from backend_auth import verify_backend_secret
from credit_manager import get_supabase_client
from ratelimit import check_ip_rate_limit, client_ip_from_request

oauth_router = APIRouter()

ISSUER = "https://app.indxr.ai"
# Must match RESOURCE_URL in mcp_server.py — the audience every token is bound to.
RESOURCE_URL = "https://app.indxr.ai/api/mcp"

ALLOWED_EXACT_HOSTS = {"claude.ai", "claude.com", "chatgpt.com"}
LOOPBACK_HOSTS = {"localhost", "127.0.0.1"}

ACCESS_TOKEN_TTL = timedelta(hours=1)
REFRESH_TOKEN_TTL = timedelta(days=90)
AUTHORIZATION_TTL = timedelta(minutes=10)
CODE_TTL = timedelta(seconds=60)

NO_STORE_HEADERS = {"Cache-Control": "no-store", "Pragma": "no-cache"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_allowed_redirect_host(uri: str) -> bool:
    """Same allowlist the consent screen enforces (apps/app/src/app/oauth/consent/page.tsx) —
    checked again here at registration time so a disallowed client can never even register."""
    try:
        parsed = urlparse(uri)
    except Exception:
        return False
    host = parsed.hostname or ""
    if host in LOOPBACK_HOSTS:
        return parsed.scheme == "http"
    return parsed.scheme == "https" and host in ALLOWED_EXACT_HOSTS


def _redirect_uri_matches(requested: str, registered: list) -> bool:
    """RFC 8252 §7.3: loopback redirect URIs are compared ignoring port (the client picks a random
    free port each run). Every other host requires an exact full-string match."""
    try:
        req = urlparse(requested)
    except Exception:
        return False
    req_host = req.hostname or ""
    for reg in registered:
        if requested == reg:
            return True
        if req_host in LOOPBACK_HOSTS:
            try:
                r = urlparse(reg)
            except Exception:
                continue
            if r.hostname in LOOPBACK_HOSTS and req.scheme == r.scheme and req.path == r.path:
                return True
    return False


def _pkce_ok(code_verifier: str, code_challenge: str, method: str) -> bool:
    if method != "S256" or not code_verifier:
        return False
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    computed = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return hmac.compare_digest(computed, code_challenge)


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _oauth_error(status_code: int, error: str, description: Optional[str] = None) -> JSONResponse:
    body = {"error": error}
    if description:
        body["error_description"] = description
    return JSONResponse(status_code=status_code, content=body, headers=NO_STORE_HEADERS)


# ── DCR ───────────────────────────────────────────────────────────────────────

@oauth_router.post("/oauth/register")
async def register_client(request: Request, body: dict):
    ip = client_ip_from_request(request.headers, request.client.host if request.client else "unknown")
    if not await check_ip_rate_limit(ip, "oauth_register", max_requests=10, window_seconds=3600):
        return _oauth_error(429, "rate_limited", "Too many registration attempts — try again later.")

    client_name = str(body.get("client_name") or "").strip()[:200]
    redirect_uris = body.get("redirect_uris")
    if not client_name:
        return _oauth_error(400, "invalid_client_metadata", "client_name is required.")
    if not isinstance(redirect_uris, list) or not redirect_uris or len(redirect_uris) > 5:
        return _oauth_error(400, "invalid_client_metadata", "redirect_uris must be 1–5 URIs.")
    for uri in redirect_uris:
        if not isinstance(uri, str) or not _is_allowed_redirect_host(uri):
            return _oauth_error(400, "invalid_redirect_uri", f"redirect_uri not allowed: {uri}")

    db = get_supabase_client()

    # Lazy cleanup: registered clients that never completed a token exchange within 30 days are
    # almost certainly abandoned test/throwaway registrations — remove them opportunistically.
    cutoff = (_now() - timedelta(days=30)).isoformat()
    try:
        db.table("oauth_clients").delete().is_("last_token_at", "null").lt("created_at", cutoff).execute()
    except Exception:
        pass  # best-effort housekeeping — never blocks a registration

    row = {
        "id": str(uuid.uuid4()),
        "client_name": client_name,
        "redirect_uris": redirect_uris,
    }
    db.table("oauth_clients").insert(row).execute()

    return JSONResponse(
        {
            "client_id": row["id"],
            "client_name": client_name,
            "redirect_uris": redirect_uris,
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
        },
        headers=NO_STORE_HEADERS,
    )


# ── Authorize (Next.js-internal; the browser never calls these directly) ────────

@oauth_router.post("/oauth/authorize/create")
async def create_authorization(body: dict, _: None = Depends(verify_backend_secret)):
    db = get_supabase_client()
    client_id = body.get("client_id")
    redirect_uri = body.get("redirect_uri")
    code_challenge = body.get("code_challenge")
    code_challenge_method = body.get("code_challenge_method")
    scope = body.get("scope")
    state = body.get("state")
    resource = body.get("resource") or RESOURCE_URL

    if resource != RESOURCE_URL:
        return _oauth_error(400, "invalid_target", "Unsupported resource.")
    if code_challenge_method != "S256" or not code_challenge:
        return _oauth_error(400, "invalid_request", "PKCE with S256 is required.")
    if not client_id or not redirect_uri:
        return _oauth_error(400, "invalid_request", "client_id and redirect_uri are required.")

    client = db.table("oauth_clients").select("id, redirect_uris").eq("id", client_id).maybe_single().execute()
    client_row = client.data if client else None
    if not client_row:
        return _oauth_error(400, "invalid_client", "Unknown client_id.")
    if not _redirect_uri_matches(redirect_uri, client_row["redirect_uris"]):
        return _oauth_error(400, "invalid_request", "redirect_uri does not match the registered client.")

    authorization_id = secrets.token_urlsafe(24)
    db.table("oauth_authorizations").insert(
        {
            "id": authorization_id,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "scope": scope,
            "resource": resource,
            "state": state,
            "status": "pending",
            "expires_at": (_now() + AUTHORIZATION_TTL).isoformat(),
        }
    ).execute()

    return JSONResponse({"authorization_id": authorization_id}, headers=NO_STORE_HEADERS)


@oauth_router.get("/oauth/authorize/{authorization_id}")
async def get_authorization(authorization_id: str, _: None = Depends(verify_backend_secret)):
    db = get_supabase_client()
    exec_result = db.table("oauth_authorizations").select("*").eq("id", authorization_id).maybe_single().execute()
    row = exec_result.data if exec_result else None
    if not row:
        return _oauth_error(404, "not_found", "Unknown or expired authorization request.")
    if row["status"] != "pending":
        return _oauth_error(400, "invalid_request", "This authorization request was already decided.")
    if datetime.fromisoformat(row["expires_at"]) < _now():
        return _oauth_error(400, "invalid_request", "This authorization request has expired.")

    client = db.table("oauth_clients").select("client_name").eq("id", row["client_id"]).maybe_single().execute()
    client_row = client.data if client else None
    client_name = (client_row or {}).get("client_name", "Unknown app")

    return JSONResponse(
        {"client": {"name": client_name}, "redirect_uri": row["redirect_uri"]},
        headers=NO_STORE_HEADERS,
    )


@oauth_router.post("/oauth/authorize/{authorization_id}/consent")
async def decide_authorization(
    authorization_id: str,
    body: dict,
    authorization: str = Header(default=""),
    _: None = Depends(verify_backend_secret),
):
    if not authorization.startswith("Bearer "):
        return _oauth_error(401, "unauthorized", "A valid user session is required.")
    session_token = authorization[len("Bearer "):]

    db = get_supabase_client()
    # Verify the CALLER's own Supabase session token (never trust a user_id Next.js merely claims)
    # — identical pattern to the Whisper-upload auth check in main.py.
    user_response = db.auth.get_user(session_token)
    if not user_response or not user_response.user:
        return _oauth_error(401, "unauthorized", "Invalid or expired session.")
    user_id = user_response.user.id

    exec_result = db.table("oauth_authorizations").select("*").eq("id", authorization_id).maybe_single().execute()
    row = exec_result.data if exec_result else None
    if not row or row["status"] != "pending" or datetime.fromisoformat(row["expires_at"]) < _now():
        return _oauth_error(400, "invalid_request", "This authorization request is no longer valid.")

    action = body.get("action")
    state_part = f"&state={quote(row['state'], safe='')}" if row.get("state") else ""
    iss_part = f"&iss={quote(ISSUER, safe='')}"

    if action == "deny":
        db.table("oauth_authorizations").update({"status": "denied"}).eq("id", authorization_id).execute()
        redirect_url = f"{row['redirect_uri']}?error=access_denied{state_part}{iss_part}"
        return JSONResponse({"redirect_url": redirect_url}, headers=NO_STORE_HEADERS)

    if action != "approve":
        return _oauth_error(400, "invalid_request", "action must be approve or deny.")

    code = _generate_token()
    db.table("oauth_authorizations").update(
        {
            "status": "approved",
            "user_id": user_id,
            "code_hash": _hash(code),
            "code_expires_at": (_now() + CODE_TTL).isoformat(),
        }
    ).eq("id", authorization_id).execute()

    redirect_url = f"{row['redirect_uri']}?code={code}{state_part}{iss_part}"
    return JSONResponse({"redirect_url": redirect_url}, headers=NO_STORE_HEADERS)


# ── Token ─────────────────────────────────────────────────────────────────────

@oauth_router.post("/oauth/token")
async def token_endpoint(
    request: Request,
    grant_type: str = Form(...),
    code: Optional[str] = Form(None),
    redirect_uri: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
    code_verifier: Optional[str] = Form(None),
    resource: Optional[str] = Form(None),
    refresh_token: Optional[str] = Form(None),
):
    ip = client_ip_from_request(request.headers, request.client.host if request.client else "unknown")
    if not await check_ip_rate_limit(ip, "oauth_token", max_requests=30, window_seconds=60):
        return _oauth_error(429, "rate_limited", "Too many requests — try again shortly.")

    db = get_supabase_client()
    resolved_resource = resource or RESOURCE_URL
    if resolved_resource != RESOURCE_URL:
        return _oauth_error(400, "invalid_target", "Unsupported resource.")

    if grant_type == "authorization_code":
        if not code or not redirect_uri or not client_id or not code_verifier:
            return _oauth_error(400, "invalid_request", "code, redirect_uri, client_id and code_verifier are required.")

        exec_result = db.table("oauth_authorizations").select("*").eq("code_hash", _hash(code)).maybe_single().execute()
        row = exec_result.data if exec_result else None
        if not row or row["status"] != "approved":
            return _oauth_error(400, "invalid_grant", "Unknown or already-used authorization code.")
        if datetime.fromisoformat(row["code_expires_at"]) < _now():
            return _oauth_error(400, "invalid_grant", "Authorization code expired.")
        if row["client_id"] != client_id or row["redirect_uri"] != redirect_uri:
            return _oauth_error(400, "invalid_grant", "client_id/redirect_uri do not match the authorization.")
        if not _pkce_ok(code_verifier, row["code_challenge"], row["code_challenge_method"]):
            return _oauth_error(400, "invalid_grant", "PKCE verification failed.")

        # Single-use: mark exchanged before issuing tokens.
        db.table("oauth_authorizations").update({"status": "exchanged"}).eq("id", row["id"]).execute()

        family_id = str(uuid.uuid4())
        access_token = _generate_token()
        new_refresh_token = _generate_token()
        now = _now()
        db.table("oauth_tokens").insert(
            [
                {
                    "token_hash": _hash(access_token), "token_type": "access",
                    "user_id": row["user_id"], "client_id": client_id, "family_id": family_id,
                    "scope": row.get("scope"), "resource": RESOURCE_URL,
                    "expires_at": (now + ACCESS_TOKEN_TTL).isoformat(),
                },
                {
                    "token_hash": _hash(new_refresh_token), "token_type": "refresh",
                    "user_id": row["user_id"], "client_id": client_id, "family_id": family_id,
                    "scope": row.get("scope"), "resource": RESOURCE_URL,
                    "expires_at": (now + REFRESH_TOKEN_TTL).isoformat(),
                },
            ]
        ).execute()
        db.table("oauth_clients").update({"last_token_at": now.isoformat()}).eq("id", client_id).execute()

        return JSONResponse(
            {
                "access_token": access_token,
                "token_type": "Bearer",
                "expires_in": int(ACCESS_TOKEN_TTL.total_seconds()),
                "refresh_token": new_refresh_token,
                "scope": row.get("scope") or "mcp",
            },
            headers=NO_STORE_HEADERS,
        )

    if grant_type == "refresh_token":
        if not refresh_token or not client_id:
            return _oauth_error(400, "invalid_request", "refresh_token and client_id are required.")

        exec_result = (
            db.table("oauth_tokens").select("*")
            .eq("token_hash", _hash(refresh_token)).eq("token_type", "refresh")
            .maybe_single().execute()
        )
        row = exec_result.data if exec_result else None
        if not row:
            return _oauth_error(400, "invalid_grant", "Unknown refresh token.")
        if row["client_id"] != client_id:
            return _oauth_error(400, "invalid_grant", "client_id does not match this refresh token.")
        if row["revoked_at"]:
            # Reuse of an already-rotated-out refresh token — treat as a possible theft and burn
            # every token in its family (OAuth 2.1 Security BCP §4.14.2).
            db.table("oauth_tokens").update({"revoked_at": _now().isoformat()}).eq("family_id", row["family_id"]).is_("revoked_at", "null").execute()
            return _oauth_error(400, "invalid_grant", "Refresh token already used.")
        if datetime.fromisoformat(row["expires_at"]) < _now():
            return _oauth_error(400, "invalid_grant", "Refresh token expired.")

        now = _now()
        db.table("oauth_tokens").update({"revoked_at": now.isoformat()}).eq("token_hash", row["token_hash"]).execute()

        access_token = _generate_token()
        new_refresh_token = _generate_token()
        db.table("oauth_tokens").insert(
            [
                {
                    "token_hash": _hash(access_token), "token_type": "access",
                    "user_id": row["user_id"], "client_id": client_id, "family_id": row["family_id"],
                    "scope": row.get("scope"), "resource": RESOURCE_URL,
                    "expires_at": (now + ACCESS_TOKEN_TTL).isoformat(),
                },
                {
                    "token_hash": _hash(new_refresh_token), "token_type": "refresh",
                    "user_id": row["user_id"], "client_id": client_id, "family_id": row["family_id"],
                    "scope": row.get("scope"), "resource": RESOURCE_URL,
                    "expires_at": (now + REFRESH_TOKEN_TTL).isoformat(),
                },
            ]
        ).execute()
        db.table("oauth_clients").update({"last_token_at": now.isoformat()}).eq("id", client_id).execute()

        return JSONResponse(
            {
                "access_token": access_token,
                "token_type": "Bearer",
                "expires_in": int(ACCESS_TOKEN_TTL.total_seconds()),
                "refresh_token": new_refresh_token,
                "scope": row.get("scope") or "mcp",
            },
            headers=NO_STORE_HEADERS,
        )

    return _oauth_error(400, "unsupported_grant_type", f"Unsupported grant_type: {grant_type}")


# ── Revoke (RFC 7009) ────────────────────────────────────────────────────────

@oauth_router.post("/oauth/revoke")
async def revoke_token(token: str = Form(...), token_type_hint: Optional[str] = Form(None)):
    db = get_supabase_client()
    token_hash = _hash(token)
    exec_result = db.table("oauth_tokens").select("token_hash, token_type, family_id").eq("token_hash", token_hash).maybe_single().execute()
    row = exec_result.data if exec_result else None
    if row:
        now = _now().isoformat()
        if row["token_type"] == "refresh":
            db.table("oauth_tokens").update({"revoked_at": now}).eq("family_id", row["family_id"]).is_("revoked_at", "null").execute()
        else:
            db.table("oauth_tokens").update({"revoked_at": now}).eq("token_hash", token_hash).execute()
    # RFC 7009 §2.2: always 200, regardless of whether the token existed — never leak that.
    return JSONResponse({}, headers=NO_STORE_HEADERS)
