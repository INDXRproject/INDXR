"""
Read-only MCP (Model Context Protocol) connector — ADR-108, phase 1.

Lets a logged-in user's AI assistant (Claude, ChatGPT in developer mode) read their own library
after OAuth login: collections, search, transcript text, source/citation, and an existing AI
summary. Never writes, never generates, never touches credits.

Security model (ADR-108, revised): an earlier version of this file verified Supabase-issued OAuth
JWTs rewritten by a Custom Access Token Hook. That failed the security gate — PostgREST/Storage/
GoTrue don't enforce `aud`, and RLS on `transcripts` keys off `auth.uid()` (the `sub` claim)
regardless of `role`, so a "scoped-down" Supabase JWT was still a fully-privileged session token
everywhere except this MCP server. This server now verifies **opaque tokens** issued by our own
OAuth 2.1 authorization server (oauth_server.py): random strings, never a valid JWT, looked up by
their SHA-256 hash in `oauth_tokens`. Supabase's own APIs reject an opaque string outright, so the
isolation guarantee no longer depends on `aud`/`role` configuration those services don't check.
Every Supabase query in every tool is filtered by `.eq("user_id", user_id)`, where `user_id` comes
from the token row's own `user_id` column — never caller-supplied.
"""

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Any

from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings

from credit_manager import get_supabase_client
from ratelimit import check_user_rate_limit

logger = logging.getLogger("indxr-mcp")

ISSUER_URL = "https://app.indxr.ai"
# Must match RESOURCE_URL in oauth_server.py — the audience every token is bound to.
RESOURCE_URL = "https://app.indxr.ai/api/mcp"
RESOURCE_METADATA_URL = "https://app.indxr.ai/.well-known/oauth-protected-resource/api/mcp"


class OpaqueTokenVerifier(TokenVerifier):
    """Hashes the incoming bearer token and looks it up in `oauth_tokens` (our own OAuth server's
    table) — never a JWT decode. Rejects anything expired, revoked, or simply unknown."""

    async def verify_token(self, token: str) -> AccessToken | None:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        db = get_supabase_client()
        exec_result = (
            db.table("oauth_tokens").select("*")
            .eq("token_hash", token_hash).eq("token_type", "access")
            .maybe_single().execute()
        )
        row = exec_result.data if exec_result else None
        if not row:
            return None
        if row.get("revoked_at"):
            return None
        expires_at = datetime.fromisoformat(row["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            return None

        return AccessToken(
            token=token,
            client_id=row["client_id"],
            scopes=["mcp"],
            expires_at=int(expires_at.timestamp()),
            resource=row["resource"],
            subject=row["user_id"],
        )


def _current_user_id() -> str:
    """The authenticated caller's user_id (the token's `sub`) — never trust a caller-supplied id."""
    access = get_access_token()
    if not access or not access.subject:
        raise ValueError("No authenticated user on this request")
    return access.subject


async def _rate_limit_or_raise(bucket: str) -> None:
    user_id = _current_user_id()
    allowed = await check_user_rate_limit(user_id, f"mcp-{bucket}", max_requests=60, window_seconds=60)
    if not allowed:
        raise ValueError("Rate limit exceeded — try again in a minute.")


mcp = MCPServer(
    name="indxr",
    title="INDXR.AI",
    instructions="Read a user's INDXR.AI transcript library: collections, search, transcript text, "
    "source citations, and existing AI summaries. Read-only — nothing here writes or deletes.",
    token_verifier=OpaqueTokenVerifier(),
    auth=AuthSettings(
        issuer_url=ISSUER_URL,
        resource_server_url=RESOURCE_URL,
        required_scopes=["mcp"],
        validate_token_resource=True,
    ),
)


# ── Tool 1: list_collections ─────────────────────────────────────────────────

@mcp.tool(
    title="List collections",
    annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
)
async def list_collections() -> list[dict[str, Any]]:
    """List this user's collections (folders) with how many transcripts are in each."""
    await _rate_limit_or_raise("list_collections")
    user_id = _current_user_id()
    db = get_supabase_client()

    cols = db.table("collections").select("id, name").eq("user_id", user_id).execute().data or []
    counts: dict[str, int] = {}
    rows = db.table("transcripts").select("collection_id").eq("user_id", user_id).execute().data or []
    for r in rows:
        cid = r.get("collection_id")
        if cid:
            counts[cid] = counts.get(cid, 0) + 1

    return [{"id": c["id"], "name": c["name"], "transcript_count": counts.get(c["id"], 0)} for c in cols]


# ── Tool 2: search_library ───────────────────────────────────────────────────

def _fts_prefix_query(token: str) -> str | None:
    """Port of apps/app/src/components/library/filters.ts ftsPrefixQuery — one search token into a
    prefix tsquery string. Only letters/digits survive, so tsquery operators and PostgREST's
    comma/paren delimiters can never reach the query string."""
    parts = [p for p in re.split(r"[^\w]+", token, flags=re.UNICODE) if p]
    return " & ".join(f"{p.lower()}:*" for p in parts) if parts else None


def _excerpt_around(text: str, needle: str, radius: int = 150) -> str:
    """±radius chars of `text` around the first case-insensitive hit of `needle` (≈300 chars total)."""
    idx = text.lower().find(needle.lower())
    if idx == -1:
        return text[: radius * 2].strip()
    start = max(0, idx - radius)
    end = min(len(text), idx + len(needle) + radius)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{text[start:end].strip()}{suffix}"


@mcp.tool(
    title="Search library",
    annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
)
async def search_library(query: str, collection_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
    """Search this user's transcript titles, channel names, and transcript text. Returns the
    matching transcripts with a short excerpt around the hit."""
    await _rate_limit_or_raise("search_library")
    user_id = _current_user_id()
    limit = max(1, min(int(limit), 20))
    db = get_supabase_client()

    search = re.sub(r"[%,()]", " ", query).strip()
    if not search:
        return []
    tokens = search.split()[:6]

    q = (
        db.table("transcripts")
        .select("id, title, channel, video_id, collection_id, duration, transcript, edited_content")
        .eq("user_id", user_id)
    )
    if collection_id:
        q = q.eq("collection_id", collection_id)
    for tok in tokens:
        fts = _fts_prefix_query(tok)
        if not fts:
            continue
        q = q.or_(f'title.ilike.%{tok}%,channel.ilike.%{tok}%,video_id.ilike.%{tok}%,search_tsv.fts(simple)."{fts}"')

    rows = q.limit(limit).execute().data or []

    first_token = tokens[0] if tokens else search
    results: list[dict[str, Any]] = []
    for r in rows:
        segments = r.get("edited_content") or r.get("transcript") or []
        full_text = " ".join(seg.get("text", "") for seg in segments if isinstance(seg, dict))
        hit_offset = None
        for seg in segments:
            if isinstance(seg, dict) and first_token.lower() in seg.get("text", "").lower():
                hit_offset = seg.get("offset")
                break
        results.append(
            {
                "id": r["id"],
                "title": r.get("title"),
                "channel": r.get("channel"),
                "collection_id": r.get("collection_id"),
                "duration_seconds": r.get("duration"),
                "excerpt": _excerpt_around(full_text, first_token) if full_text else None,
                "youtube_url": (
                    f"https://youtu.be/{r['video_id']}?t={int(hit_offset)}"
                    if r.get("video_id") and hit_offset is not None
                    else (f"https://youtu.be/{r['video_id']}" if r.get("video_id") else None)
                ),
            }
        )
    return results


# ── Tool 3: get_transcript ───────────────────────────────────────────────────

def _resolve_speaker(label: str | None, names: dict[str, str] | None) -> str | None:
    if not label:
        return None
    custom = (names or {}).get(label)
    return custom.strip() if custom and custom.strip() else f"Speaker {label}"


def _paragraphs_for_window(
    segments: list[dict[str, Any]],
    speaker_names: dict[str, str] | None,
    start_sec: float,
    end_sec: float,
) -> list[dict[str, Any]]:
    """Simplified port of buildReadingParagraphs (packages/shared/src/utils/formatTranscript.ts):
    groups consecutive segments into paragraphs, breaking on a >2s pause or a speaker change, capped
    at ~45s per paragraph. Not byte-identical to the web reader (which also breaks on sentence
    boundaries) — good enough for an AI to read a windowed chunk with timestamps."""
    windowed = [s for s in segments if start_sec <= s.get("offset", 0) < end_sec]
    paras: list[dict[str, Any]] = []
    cur_text: list[str] = []
    cur_start: float | None = None
    cur_speaker: str | None = None
    cur_duration = 0.0
    prev_end: float | None = None

    def flush():
        if cur_text:
            name = _resolve_speaker(cur_speaker, speaker_names)
            text = " ".join(cur_text).strip()
            paras.append({"start": cur_start, "speaker": name, "text": text})

    for seg in windowed:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        offset = seg.get("offset", 0)
        duration = seg.get("duration", 0)
        speaker = seg.get("speaker")
        gap = (offset - prev_end) if prev_end is not None else 0
        speaker_changed = bool(cur_text) and speaker != cur_speaker
        if cur_text and (gap > 2 or cur_duration > 45 or speaker_changed):
            flush()
            cur_text, cur_duration = [], 0.0
        if not cur_text:
            cur_start = offset
            cur_speaker = speaker
        cur_text.append(text)
        cur_duration += duration
        prev_end = offset + duration
    flush()
    return paras


def _fmt_mmss(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


@mcp.tool(
    title="Get transcript",
    annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
)
async def get_transcript(id: str, start_minute: float = 0, minutes: float = 15) -> dict[str, Any]:
    """Read this transcript's text for a time window, in paragraphs with [mm:ss] timestamps and
    speaker names. Use `start_minute` to page through a long transcript — the response says whether
    there is more."""
    await _rate_limit_or_raise("get_transcript")
    user_id = _current_user_id()
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("id, title, transcript, edited_content, speaker_names, duration")
        .eq("id", id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise ValueError("No transcript with this id in your library.")

    used_edited = bool(row.get("edited_content"))
    segments = row.get("edited_content") if used_edited else row.get("transcript")
    segments = segments or []
    speaker_names = row.get("speaker_names") or {}

    start_sec = max(0.0, float(start_minute) * 60)
    window_sec = max(60.0, min(float(minutes), 30) * 60)  # cap a single window at 30 minutes
    end_sec = start_sec + window_sec

    paras = _paragraphs_for_window(segments, speaker_names, start_sec, end_sec)
    lines = [f"[{_fmt_mmss(p['start'])}] " + (f"{p['speaker']}: " if p["speaker"] else "") + p["text"] for p in paras]

    total_duration = row.get("duration") or (segments[-1]["offset"] + segments[-1]["duration"] if segments else 0)
    has_more = end_sec < total_duration

    note = (
        "This transcript has a saved edited version; showing the edited text without original timecodes attribution."
        if used_edited
        else None
    )

    return {
        "title": row.get("title"),
        "start_minute": start_minute,
        "text": "\n\n".join(lines) if lines else "(nothing in this time window)",
        "next": {"start_minute": start_sec / 60 + window_sec / 60} if has_more else None,
        "note": note,
    }


# ── Tool 4: get_source ───────────────────────────────────────────────────────

_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _apa_date(iso: str | None) -> str | None:
    if not iso:
        return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", iso)
    if not m:
        return None
    year, month, day = m.groups()
    return f"{year}, {_MONTHS[int(month) - 1]} {int(day)}"


def _build_citation(title: str, channel: str | None, video_id: str | None, published_at: str | None) -> str:
    """Port of buildCitation in apps/app/src/components/library/SourceCard.tsx."""
    date = _apa_date(published_at) or "n.d."
    if video_id:
        author = (channel or "").strip() or "Unknown channel"
        return f"{author}. ({date}). {title} [Video]. YouTube. https://youtu.be/{video_id}"
    return f"{title} [Audio recording]. ({date})."


@mcp.tool(
    title="Get source",
    annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
)
async def get_source(id: str) -> dict[str, Any]:
    """This transcript's source: title, channel, link, duration, word count, language, publication
    date, collection, when it was added, and a ready APA-7 citation."""
    await _rate_limit_or_raise("get_source")
    user_id = _current_user_id()
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("title, channel, video_id, duration, character_count, language, published_at, collection_id, created_at")
        .eq("id", id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise ValueError("No transcript with this id in your library.")

    collection_name = None
    if row.get("collection_id"):
        col = db.table("collections").select("name").eq("id", row["collection_id"]).maybe_single().execute().data
        collection_name = (col or {}).get("name")

    title = row.get("title") or "Untitled"
    return {
        "title": title,
        "channel": row.get("channel"),
        "youtube_url": f"https://youtu.be/{row['video_id']}" if row.get("video_id") else None,
        "duration_seconds": row.get("duration"),
        "word_count": round(row["character_count"] / 5) if row.get("character_count") else None,
        "language": row.get("language"),
        "published_at": row.get("published_at"),
        "collection": collection_name,
        "added_at": row.get("created_at"),
        "citation_apa7": _build_citation(title, row.get("channel"), row.get("video_id"), row.get("published_at")),
    }


# ── Tool 5: get_summary ──────────────────────────────────────────────────────

@mcp.tool(
    title="Get summary",
    annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
)
async def get_summary(id: str) -> dict[str, Any]:
    """This transcript's existing AI summary, if one has been generated. Never generates a new
    one (that costs credits) — says so instead when none exists."""
    await _rate_limit_or_raise("get_summary")
    user_id = _current_user_id()
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("title, ai_summary, ai_summary_edited")
        .eq("id", id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise ValueError("No transcript with this id in your library.")

    summary = row.get("ai_summary_edited") or row.get("ai_summary")
    if not summary:
        return {"title": row.get("title"), "summary": None, "note": "No summary has been generated for this transcript yet."}

    return {
        "title": row.get("title"),
        "overview": summary.get("overview"),
        "sections": [
            {"heading": s.get("heading"), "start_minute": (s.get("start_time") or 0) / 60, "content": s.get("content")}
            for s in (summary.get("sections") or [])
        ],
    }


# ASGI sub-app, mounted at /mcp in main.py. stateless_http=True (no server-side session state to
# scale), DNS-rebinding protection off (this is reached only via the Next.js server-side proxy,
# never directly by a browser, so that browser-focused protection does not apply here).
mcp_app = mcp.streamable_http_app(
    streamable_http_path="/",
    stateless_http=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)
