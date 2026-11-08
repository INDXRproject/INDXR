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
from mcp.server.mcpserver.exceptions import ToolError
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
        raise ToolError("Rate limit exceeded — try again in a minute.")


_UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def _require_transcript_id(value: Any) -> str:
    v = str(value or "").strip()
    if not _UUID_RE.match(v):
        raise ToolError(
            f"'{v}' is not a valid transcript id. Transcript ids look like "
            "'07699035-6b71-4678-b281-850e72c228ab'; get them from search_library."
        )
    return v


def _not_found() -> ToolError:
    return ToolError(
        "No transcript with this id in your library. Use search_library to find the right id."
    )


def _clean(text: str) -> str:
    """Collapse caption line breaks and runs of whitespace into single spaces."""
    return re.sub(r"\s+", " ", text or "").strip()


_TS_RE = re.compile(r"^\s*\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*")


def _node_text(node: Any) -> str:
    if not isinstance(node, dict):
        return ""
    if node.get("type") == "text":
        return node.get("text") or ""
    return "".join(_node_text(c) for c in (node.get("content") or []))


def _edited_paragraphs(doc: Any) -> list[dict[str, Any]]:
    """The saved edited version is a Tiptap document (one paragraph per reading paragraph, each
    starting with its '[mm:ss]' or '[h:mm:ss]' marker — see transcriptToJSON in TranscriptViewer.tsx).
    Turn it back into {start, speaker, text} paragraphs; a paragraph without a marker inherits the
    previous start time."""
    out: list[dict[str, Any]] = []
    last = 0.0
    nodes = doc.get("content") if isinstance(doc, dict) else None
    for node in nodes or []:
        text = _node_text(node)
        m = _TS_RE.match(text)
        if m:
            a, b, c = m.groups()
            last = float(int(a) * 3600 + int(b) * 60 + int(c)) if c else float(int(a) * 60 + int(b))
            text = text[m.end():]
        text = _clean(text)
        if text:
            out.append({"start": last, "speaker": None, "text": text})
    return out


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
async def list_collections() -> dict[str, Any]:
    """List this user's collections (folders) with how many transcripts are in each."""
    await _rate_limit_or_raise("list_collections")
    user_id = _current_user_id()
    db = get_supabase_client()

    cols = db.table("collections").select("id, name").eq("user_id", user_id).execute().data or []
    counts: dict[str, int] = {}
    rows = db.table("transcripts").select("collection_id").eq("user_id", user_id).execute().data or []
    uncategorized = 0
    for r in rows:
        cid = r.get("collection_id")
        if cid:
            counts[cid] = counts.get(cid, 0) + 1
        else:
            uncategorized += 1

    return {
        "collections": [
            {"id": c["id"], "name": c["name"], "transcript_count": counts.get(c["id"], 0)} for c in cols
        ],
        "transcripts_not_in_a_collection": uncategorized,
        "total_transcripts": len(rows),
    }


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
async def search_library(query: str, collection_id: str | None = None, limit: int = 10) -> dict[str, Any]:
    """Search this user's transcript titles, channel names, and transcript text. Returns the
    matching transcripts with a short excerpt around the hit."""
    await _rate_limit_or_raise("search_library")
    user_id = _current_user_id()
    limit = max(1, min(int(limit), 20))
    db = get_supabase_client()

    search = re.sub(r"[%,()]", " ", query or "").strip()
    if not search:
        raise ToolError("The search is empty. Give one or more words to look for.")
    tokens = search.split()[:6]

    collection_name = None
    if collection_id:
        cid = str(collection_id).strip()
        if not _UUID_RE.match(cid):
            raise ToolError(
                f"'{cid}' is not a valid collection id. Get collection ids from list_collections, "
                "or leave collection_id empty to search the whole library."
            )
        col_res = db.table("collections").select("name").eq("id", cid).eq("user_id", user_id).maybe_single().execute()
        col = col_res.data if col_res else None
        if not col:
            raise ToolError("No collection with this id in your library. Call list_collections to see the valid ids.")
        collection_name = col.get("name")
        collection_id = cid

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
        if r.get("edited_content"):
            pieces = [(p["start"], p["text"]) for p in _edited_paragraphs(r["edited_content"])]
        else:
            pieces = [
                (seg.get("offset", 0), _clean(seg.get("text", "")))
                for seg in (r.get("transcript") or [])
                if isinstance(seg, dict)
            ]
        full_text = _clean(" ".join(t for _, t in pieces))
        hit_offset = None
        for off, t in pieces:
            if first_token.lower() in t.lower():
                hit_offset = off
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
    note = None
    if not results:
        where = f" in the collection '{collection_name}'" if collection_name else ""
        note = (
            f"No matches for '{search}'{where}. Search matches whole words and word beginnings in "
            "titles, channel names and transcript text (all words must appear); it does not search "
            "by meaning. Try fewer or different words."
        )
    return {"query": search, "collection": collection_name, "results": results, "note": note}


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
            text = _clean(" ".join(cur_text))
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
    tid = _require_transcript_id(id)
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("id, title, transcript, edited_content, speaker_names, duration")
        .eq("id", tid)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise _not_found()

    notes: list[str] = []
    try:
        start_min = float(start_minute)
        win_min = float(minutes)
    except (TypeError, ValueError):
        raise ToolError("start_minute and minutes must be numbers, e.g. start_minute=15, minutes=15.")
    if start_min < 0:
        notes.append(f"start_minute {start_minute} is negative; started at 0.")
        start_min = 0.0
    if win_min < 1 or win_min > 30:
        clamped = min(max(win_min, 1.0), 30.0)
        notes.append(f"minutes must be between 1 and 30; used {clamped:g}.")
        win_min = clamped

    used_edited = isinstance(row.get("edited_content"), dict)
    segments = [s for s in (row.get("transcript") or []) if isinstance(s, dict)]
    if used_edited:
        all_paras = _edited_paragraphs(row["edited_content"])
        notes.append("Showing the user's edited version of this transcript.")
    else:
        all_paras = None

    last_seg_end = (segments[-1].get("offset", 0) + segments[-1].get("duration", 0)) if segments else 0
    total_sec = float(row.get("duration") or last_seg_end or (all_paras[-1]["start"] if all_paras else 0))
    total_min = round(total_sec / 60, 1)

    start_sec = start_min * 60
    if total_sec and start_sec >= total_sec:
        raise ToolError(
            f"start_minute {start_minute} is past the end: this transcript is {total_min} minutes long. "
            "Use a start_minute below that."
        )
    end_sec = start_sec + win_min * 60

    if all_paras is not None:
        paras = [p for p in all_paras if start_sec <= p["start"] < end_sec]
    else:
        paras = _paragraphs_for_window(segments, row.get("speaker_names") or {}, start_sec, end_sec)
    lines = [f"[{_fmt_mmss(p['start'])}] " + (f"{p['speaker']}: " if p["speaker"] else "") + p["text"] for p in paras]

    has_more = end_sec < total_sec
    return {
        "title": row.get("title"),
        "total_minutes": total_min,
        "from_minute": round(start_min, 2),
        "to_minute": round(min(end_sec, total_sec) / 60, 2) if total_sec else round(end_sec / 60, 2),
        "text": "\n\n".join(lines) if lines else "(no speech in this part of the recording)",
        "next": {"start_minute": round(end_sec / 60, 2)} if has_more else None,
        "note": " ".join(notes) or None,
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
    tid = _require_transcript_id(id)
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("title, channel, video_id, duration, character_count, language, published_at, collection_id, created_at")
        .eq("id", tid)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise _not_found()

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
    tid = _require_transcript_id(id)
    db = get_supabase_client()

    exec_result = (
        db.table("transcripts")
        .select("title, ai_summary, ai_summary_edited")
        .eq("id", tid)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = exec_result.data if exec_result else None
    if not row:
        raise _not_found()

    summary = row.get("ai_summary_edited") or row.get("ai_summary")
    if not summary:
        return {"title": row.get("title"), "summary": None, "note": "No summary has been generated for this transcript yet. The user can create one in INDXR (Summary tab); you can also read the transcript with get_transcript and summarise it yourself."}

    return {
        "title": row.get("title"),
        "overview": summary.get("overview"),
        "sections": [
            {"heading": s.get("heading"), "start": _fmt_mmss(s.get("start_time") or 0), "start_minute": round((s.get("start_time") or 0) / 60, 2), "content": s.get("content")}
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
