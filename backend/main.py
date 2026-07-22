from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends, Header
from fastapi.responses import JSONResponse
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from arq import create_pool
from arq.connections import RedisSettings as ArqRedisSettings
from pydantic import BaseModel
from typing import List, Optional, Dict
import re
import uuid
import secrets
import logging
import json
import os
import tempfile
import time
from dotenv import load_dotenv
import posthog
from datetime import datetime, timezone, timedelta
from upstash_redis.asyncio import Redis as UpstashRedis

import yt_dlp
from master_cache import master_transcripts_read, master_transcripts_write
from youtube_utils import get_proxy_url, extract_via_youtube_transcript_api, extract_with_ytdlp, _CountingYoutubeDL
from transcription_pipeline import run_whisper_reservation_aware
from language_utils import normalize_language_code

# Load environment variables
load_dotenv()

# Initialize PostHog
posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
# EU host with an explicit EU-fallback — a missing env must never fall back to the SDK's US default.
posthog.host = os.getenv("POSTHOG_HOST", "https://eu.i.posthog.com")
posthog.disable_geoip = True  # no IP-based geo enrichment on server-side events


# Fase 4 stale-detectie: running jobs zonder heartbeat-update > 5 min worden 'interrupted'.
# Enkel van toepassing als last_heartbeat_at IS NOT NULL (legacy jobs vóór Fase 4 deploy
# hebben NULL heartbeat — die worden met rust gelaten om false-positives te voorkomen).
# 300s = 5 missed heartbeats (interval 60s) — geeft marge voor incidentele event-loop blips
# of Supabase write-haperingen zonder false-positives.
HEARTBEAT_STALE_SECS = 300


def track_event(distinct_id: str, event: str, properties: Optional[Dict] = None):
    """Fire and forget PostHog event tracking. Never blocks main flow."""
    if not posthog.api_key:
        return
    try:
        posthog.capture(distinct_id=distinct_id, event=event, properties=properties or {})
    except Exception as e:
        logging.getLogger("indxr-backend").warning(f"PostHog tracking failed: {e}")

# Caption Redis cache — lazy init, gracefully skipped if env vars absent
_caption_redis: Optional[UpstashRedis] = None

def get_caption_redis() -> Optional[UpstashRedis]:
    global _caption_redis
    if _caption_redis is None:
        url = os.getenv("UPSTASH_REDIS_REST_URL")
        token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
        if url and token:
            _caption_redis = UpstashRedis(url=url, token=token)
    return _caption_redis

_CAPTION_CACHE_TTL = 60 * 60 * 24 * 30  # 30 days

# Required keys for a valid caption-cache entry. Cache-read code validates
# all keys are present before use. On missing keys: entry is evicted and
# treated as a cache-miss. Update this set when adding new fields to
# ExtractResponse that are written to the cache.
CACHED_CAPTION_REQUIRED_KEYS = frozenset({
    "title", "video_url", "duration", "channel",
    "language", "transcript",
})

# Import Whisper modules
from audio_utils import (
    get_audio_duration,
    estimate_upload_reserve_cost,
    extract_youtube_audio,
    validate_audio_file,
    compress_audio_if_needed,
    MembersOnlyVideoError,
    MEMBERS_ONLY_KEYWORDS,
)
from assemblyai_client import transcribe_with_assemblyai
from credit_manager import (
    check_user_balance,
    calculate_credit_cost,
    deduct_credits,
    add_credits,
    reserve_credits,
    RESERVATION_ENABLED,
    get_supabase_client,
    record_proxy_bytes,
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True,
)
logger = logging.getLogger("indxr-backend")
logger.setLevel(logging.INFO)
# Force root logger to INFO — basicConfig + force=True alleen is niet voldoende;
# Sentry SDK zet root terug naar WARNING na onze basicConfig. Expliciete setLevel
# op root logger werkt wel.
logging.getLogger().setLevel(logging.INFO)

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_scrub import sentry_scrub

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration(), HttpxIntegration()],
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
    send_default_pii=False,   # never attach user IP / cookies / body by default
    before_send=sentry_scrub, # scrub email/IP/auth-headers/body before send (errors stay)
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.getenv("ARQ_REDIS_URL")
    if redis_url:
        app.state.arq_pool = await create_pool(ArqRedisSettings.from_dsn(redis_url))
        logger.info("ARQ pool initialized")
    else:
        app.state.arq_pool = None
        logger.warning("ARQ_REDIS_URL not set — YouTube Whisper falls back to asyncio.create_task")
    yield
    if getattr(app.state, 'arq_pool', None):
        await app.state.arq_pool.aclose()
        logger.info("ARQ pool closed")

app = FastAPI(title="INDXR.AI Backend", version="1.0.0", lifespan=lifespan)

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

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://indxr.ai",
        "https://www.indxr.ai",
        "https://app.indxr.ai",
        "https://indxr.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ExtractRequest(BaseModel):
    videoIdOrUrl: str
    user_id: Optional[str] = None  # geauthenticeerde caller (concurrency-cap); None voor anon marketing

class TranscriptItem(BaseModel):
    text: str
    offset: float
    duration: float

class ExtractResponse(BaseModel):
    success: bool
    transcript: Optional[List[TranscriptItem]] = None
    title: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[float] = None
    channel: Optional[str] = None
    language: Optional[str] = None
    language_detected: Optional[bool] = None
    upload_date: Optional[str] = None
    error: Optional[str] = None
    error_type: Optional[str] = None

class PlaylistEntry(BaseModel):
    id: str
    title: str
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    has_captions: Optional[bool] = None

class PlaylistInfoResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    entries: Optional[List[PlaylistEntry]] = None
    total_count: Optional[int] = None
    unavailable_count: Optional[int] = None
    error: Optional[str] = None

class PlaylistExtractRequest(BaseModel):
    video_ids: List[str]
    user_id: str
    collection_id: Optional[str] = None
    use_whisper_ids: List[str] = []
    playlist_title: Optional[str] = None
    playlist_url: Optional[str] = None
    video_metadata: Optional[dict] = {}  # {video_id: {title, duration, thumbnail}}
    is_retry: bool = False  # retry-/retry-all-job: onderdrukt de gratis-3 (die is al in de originele run verbruikt)

class WhisperRequest(BaseModel):
    user_id: str
    source_type: str  # "youtube" or "upload"
    video_id: Optional[str] = None

class WhisperResponse(BaseModel):
    success: bool
    transcript: Optional[List[TranscriptItem]] = None
    duration: Optional[float] = None
    credits_used: Optional[int] = None
    error: Optional[str] = None
    required_credits: Optional[int] = None
    available_credits: Optional[int] = None

class SummarizeRequest(BaseModel):
    transcript_id: str
    user_id: str

class SummarizeResponse(BaseModel):
    success: bool
    summary: Optional[Dict] = None
    error: Optional[str] = None

# Helper function to extract video ID from URL
def extract_video_id(input_str: str) -> str:
    """Extract YouTube video ID from URL or return as-is if already an ID."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, input_str)
        if match:
            return match.group(1)
    
    return input_str

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "INDXR.AI Backend",
        "version": "1.0.0"
    }

async def _log_caption_event(user_id, video_id, proxy_bytes, cache_hit, credits_used=0, success=True, source='single', duration_ms=None):
    """BLOK A: schrijf één per-caption event-rij voor een INGELOGDE user (usage_logs).
    De RPC snapshot't had_paid + is_internal server-side. Anoniem (user_id None) → no-op:
    die captions tellen in daily_cost_counters (bump_caption_proxy_bytes), niet per-rij.
    Standalone captions kosten 0 credits (credits_used=0); playlist geeft 1 door voor betaalde video's.
    B3: source ('single'|'playlist') voedt Operations.
    ADR-071: duration_ms = server-side gemeten extractie-latency (cache-hit én miss), voor de
    limits/overview-docs. Geen PII."""
    if not user_id:
        return
    try:
        _sb = get_supabase_client()
        await asyncio.to_thread(
            lambda: _sb.rpc('log_caption_usage', {
                'p_user_id': user_id,
                'p_video_id': video_id,
                'p_proxy_bytes': int(proxy_bytes or 0),
                'p_cache_hit': bool(cache_hit),
                'p_credits_used': int(credits_used or 0),
                'p_success': bool(success),
                'p_source': source if source in ('single', 'playlist') else 'single',
                'p_duration_ms': int(duration_ms) if duration_ms is not None else None,
            }).execute()
        )
    except Exception as e:
        logger.warning(f"[caption-usage] log failed for {video_id}: {e}")


@app.post("/api/extract/youtube", response_model=ExtractResponse)
async def extract_youtube_transcript(request: ExtractRequest, _: None = Depends(verify_backend_secret)):
    """Extract transcript from YouTube video using yt-dlp."""
    _t0 = time.monotonic()  # ADR-071: server-side caption-extractie-latency
    try:
        video_id = extract_video_id(request.videoIdOrUrl)

        # Concurrency-cap (resource-bescherming, geen credits): een geauthenticeerde user met >= MAX
        # lopende jobs mag geen extra yt-dlp/proxy-belasting starten. Anonieme marketing-requests
        # (geen user_id) blijven ongewijzigd (IP-rate-limited door de Next.js-route).
        if request.user_id:
            _cap_sb = get_supabase_client()
            if await asyncio.to_thread(_count_active_jobs, _cap_sb, request.user_id) >= MAX_CONCURRENT_JOBS:
                return _too_many_jobs_response()
        # Language-agnostic key — language lives in the stored value, not the key.
        cache_key = f"caption:{video_id}"
        redis = get_caption_redis()

        # ── Cache read ────────────────────────────────────────────────────────
        if redis:
            try:
                cached_raw = await redis.get(cache_key)
                if cached_raw:
                    result = json.loads(cached_raw)
                    missing = CACHED_CAPTION_REQUIRED_KEYS - set(result.keys())
                    if missing:
                        logger.info(f"Caption cache entry malformed (missing: {missing}) — evicting and treating as miss: {video_id}")
                        await redis.delete(cache_key)
                        raise KeyError(f"malformed cache entry, missing: {missing}")
                    cached_lang = result.get('language') or 'unknown'
                    track_event("backend", "caption_cache_hit", {"video_id": video_id, "lang": cached_lang})
                    logger.info(f"Caption cache HIT: {video_id}")
                    # BLOK A: cache-hit → 0 egress, maar wél een per-user rij (funnel-inzicht).
                    await _log_caption_event(request.user_id, video_id, 0, cache_hit=True,
                                             duration_ms=int((time.monotonic() - _t0) * 1000))
                    transcript = [
                        TranscriptItem(
                            text=item['text'],
                            offset=item['offset'],
                            duration=item['duration']
                        )
                        for item in result['transcript']
                    ]
                    return ExtractResponse(
                        success=True,
                        transcript=transcript,
                        title=result['title'],
                        video_url=result['video_url'],
                        duration=result.get('duration'),
                        channel=result.get('channel'),
                        language=result.get('language'),
                        language_detected=result.get('language_detected'),
                        upload_date=result.get('upload_date'),
                    )
            except Exception as cache_read_err:
                logger.warning(f"Caption cache read error: {cache_read_err}")

        # ── Language pre-fetch for master cache lookup ────────────────────────
        # Fetches video metadata (title, duration, language) via YouTube Data API
        # before the master cache read. The same call was already made in both
        # hit and miss paths below — hoisting it here removes the duplication.
        # Quota note: zero net change in quota units vs. before (ADR-028).
        # On failure (quota exhausted, network): normalised_lang=None → skip
        # master cache → proceed directly to cascade (no regression).
        normalised_lang: Optional[str] = None
        pre_meta: dict = {}
        try:
            pre_meta = await asyncio.to_thread(youtube_client.get_video_details, video_id)
            normalised_lang = normalize_language_code(pre_meta.get('language'))
        except Exception as pre_meta_err:
            err_str = str(pre_meta_err)
            if 'quotaExceeded' in err_str or ('403' in err_str and 'quota' in err_str.lower()):
                logger.warning(f"[YT-DATA-API quota exceeded] pre-fetch {video_id}: {pre_meta_err}")
            else:
                logger.warning(f"[YT-DATA-API pre-fetch failed] {video_id}: {pre_meta_err}")

        track_event("backend", "caption_cache_miss", {"video_id": video_id, "lang": normalised_lang or "unknown"})

        # ── master_transcripts cache check (warm path) ───────────────────────
        # Language-aware: looks up by normalised language from YouTube Data API.
        # Skip if language unknown (normalised_lang=None) to avoid false misses.
        if normalised_lang is not None:
            mc = await master_transcripts_read(video_id, source_method="caption_extraction", language=normalised_lang)
            if mc is not None:
                logger.info(f"master_transcripts HIT (caption): {video_id} lang={normalised_lang}")
                track_event("backend", "master_cache_hit", {"video_id": video_id, "source": "caption"})
                # BLOK A: master-cache hit → 0 egress, per-user rij (funnel-inzicht).
                await _log_caption_event(request.user_id, video_id, 0, cache_hit=True,
                                         duration_ms=int((time.monotonic() - _t0) * 1000))
                mc_transcript = [
                    TranscriptItem(text=s["text"], offset=s["offset"], duration=s["duration"])
                    for s in mc["transcript"]
                ]
                # Backfill Redis-cache zodat de volgende request de hot-path raakt.
                if redis:
                    try:
                        backfill = {
                            "transcript": mc["transcript"],
                            "title": pre_meta.get("title", video_id),
                            "video_url": f"https://www.youtube.com/watch?v={video_id}",
                            "duration": mc.get("duration_seconds"),
                            "language": mc.get("language"),
                            # language_detected is a BOOL (was the language runtime-detected?).
                            # A cached hit's language is authoritative/known → False. Storing the
                            # language STRING here (old bug) made the next Redis hit fail
                            # ExtractResponse validation and 400 the whole request.
                            "language_detected": False,
                        }
                        await redis.set(cache_key, json.dumps(backfill), ex=_CAPTION_CACHE_TTL)
                    except Exception:
                        pass
                return ExtractResponse(
                    success=True,
                    transcript=mc_transcript,
                    title=pre_meta.get("title", video_id),
                    video_url=f"https://www.youtube.com/watch?v={video_id}",
                    duration=pre_meta.get("duration") or mc.get("duration_seconds"),
                    channel=pre_meta.get("channel"),
                    language=mc.get("language"),
                    # BOOL field: cached language is known/authoritative → False (not
                    # runtime-detected). Passing the language string here 400'd every
                    # caption master-cache hit (e.g. Arabic jKz9GLqhuPo).
                    language_detected=False,
                )

        # ── Cascade step 1: youtube-transcript-api ───────────────────────────
        session_id = video_id[-8:]
        result = await extract_via_youtube_transcript_api(video_id, session_id=session_id, lang_pref=normalised_lang)
        caption_model = "youtube_transcript_api"

        # ── Cascade step 1 metadata enrichment (reuse pre_meta if available) ──
        if result is not None:
            if pre_meta:
                result['title'] = pre_meta.get('title', video_id)
                result['video_url'] = f"https://www.youtube.com/watch?v={video_id}"
                result['duration'] = pre_meta.get('duration')
                result['channel'] = pre_meta.get('channel')
                result['upload_date'] = pre_meta.get('upload_date')
            else:
                # pre_meta fetch failed earlier — try again now (only for cascade path)
                try:
                    meta = await asyncio.to_thread(youtube_client.get_video_details, video_id)
                    result['title'] = meta['title']
                    result['video_url'] = f"https://www.youtube.com/watch?v={video_id}"
                    result['duration'] = meta.get('duration')
                    result['channel'] = meta.get('channel')
                    result['upload_date'] = meta.get('upload_date')
                except Exception as meta_err:
                    err_str = str(meta_err)
                    if 'quotaExceeded' in err_str or ('403' in err_str and 'quota' in err_str.lower()):
                        logger.warning(f"[YT-DATA-API quota exceeded] {video_id}: {meta_err}")
                    else:
                        logger.warning(f"[YT-DATA-API metadata fetch failed] {video_id}: {meta_err}")
                    result = None  # discard step 1, fall through to step 2

        # ── Cascade step 2: yt-dlp (ios/web_embedded) ───────────────────────
        if result is None:
            try:
                result = await extract_with_ytdlp(video_id, use_proxy=True, session_id=session_id, lang_pref=normalised_lang)
                caption_model = "youtube_captions"
            except MembersOnlyVideoError:
                raise  # structural — step 3 cannot help
            except Exception as step2_err:
                # ── Cascade step 3: yt-dlp (tv/android client rotation) ──────
                logger.info(f"[CASCADE] {video_id}: step 2 failed ({type(step2_err).__name__}), trying step 3 (tv/android)")
                result = await extract_with_ytdlp(video_id, use_proxy=True, session_id=session_id, clients=['tv', 'android'], lang_pref=normalised_lang)
                caption_model = "youtube_captions_rotated"

        # result can be a dict (success) or list (empty/failure)
        if isinstance(result, list) or not result:
            logger.warning(f"No captions found for {video_id}")
            # BLOK A: mislukte caption (ingelogd) — bytes onbekend op dit pad (leeg/list-result),
            # log 0 met success=false zodat de rij het event registreert (egress hier ~metadata-only).
            await _log_caption_event(request.user_id, video_id, 0, cache_hit=False, success=False,
                                     duration_ms=int((time.monotonic() - _t0) * 1000))
            return ExtractResponse(
                success=False,
                error="No captions found for this video",
                error_type="no_captions"
            )

        # Decodo egress van de cache-MISS caption (step 1: video page + timedtext; step 2/3: yt-dlp VTT).
        # BLOK A/D-splitsing:
        #   • INGELOGD  → per-user usage_logs-rij (log_caption_usage). credits_used=0 (standalone captions
        #                 zijn gratis) → deze rijen vormen de free-funnel-OPEX per scope, niet COR.
        #   • ANONIEM   → day-grain daily_cost_counters (bump_caption_proxy_bytes), geen per-rij.
        # Een cache-hit retourneert eerder → geen egress → geen dubbeltelling.
        cap_bytes = result.get('proxy_bytes') or 0
        if request.user_id:
            await _log_caption_event(request.user_id, video_id, cap_bytes, cache_hit=False,
                                     duration_ms=int((time.monotonic() - _t0) * 1000))
        elif cap_bytes:
            try:
                _cap_sb = get_supabase_client()
                await asyncio.to_thread(
                    lambda: _cap_sb.rpc('bump_caption_proxy_bytes', {'p_bytes': cap_bytes}).execute()
                )
            except Exception as _bump_err:
                logger.warning(f"[caption-bytes] anon bump failed for {video_id}: {_bump_err}")

        transcript = [
            TranscriptItem(
                text=item['text'],
                offset=item['offset'],
                duration=item['duration']
            )
            for item in result['transcript']
        ]

        # ── Cache write (best-effort) ─────────────────────────────────────────
        if redis and result.get('transcript'):
            try:
                await redis.set(cache_key, json.dumps(result), ex=_CAPTION_CACHE_TTL)
                logger.info(f"Caption cache SET: {video_id}")
            except Exception as cache_write_err:
                track_event("backend", "caption_cache_write_error", {"error": str(cache_write_err)})
                logger.warning(f"Caption cache write error: {type(cache_write_err).__name__}: {cache_write_err}")

        # ── Master cache write (fire-and-forget) ─────────────────────────────
        # force_refresh=True → UPSERT (not insert-only). Reasons:
        #  (1) Self-healing: a stale/wrong-content row (e.g. a pre-fix Albanian
        #      transcript stored under language='en') is overwritten the moment a
        #      correct extraction runs, instead of a 409 duplicate-key that silently
        #      leaves the bad row immortal (which made the Napoleon leak un-fixable
        #      by retry).
        #  (2) 90-day refresh actually works: the read expires a row after
        #      CAPTION_REFRESH_DAYS, but insert-only could never update
        #      fetched_from_provider_at → an expired row would re-run the full
        #      cascade on every request forever. Upsert refreshes the timestamp.
        # This write only fires on a cache MISS, so overwriting with fresh content
        # is exactly the intended behaviour.
        if result.get('transcript'):
            lang = normalize_language_code(result.get('language')) or 'en'
            duration_sec = result.get('duration') or 0
            asyncio.create_task(master_transcripts_write(
                video_id=video_id,
                language=lang,
                model=caption_model,
                transcript_data=result['transcript'],
                duration_seconds=int(duration_sec),
                source_method='caption_extraction',
                force_refresh=True,
                title=result.get('title'),
                channel=result.get('channel'),
            ))

        return ExtractResponse(
            success=True,
            transcript=transcript,
            title=result['title'],
            video_url=result['video_url'],
            duration=result.get('duration'),
            channel=result.get('channel'),
            language=result.get('language'),
            language_detected=result.get('language_detected'),
            upload_date=result.get('upload_date'),
        )

    except MembersOnlyVideoError:
        return JSONResponse(
            status_code=403,
            content={"success": False, "error": "members_only", "error_type": "members_only", "message": "This video is only available to channel members and cannot be transcribed."}
        )
    except Exception as e:
        error_msg = str(e)
        error_lower = error_msg.lower()
        if any(kw in error_lower for kw in ('age-restricted', 'age restricted', 'only available on youtube', 'confirm your age')):
            error_type = 'age_restricted'
        elif any(kw in error_lower for kw in ('sign in to confirm', 'confirming you', 'not a bot', '429', 'too many requests')):
            error_type = 'bot_detection'
        elif any(kw in error_lower for kw in ('timed out', 'timeout', 'read timed out', '504', 'gateway timeout')):
            error_type = 'timeout'
        elif '152' in error_msg or 'unavailable' in error_lower:
            error_type = 'youtube_restricted'
        else:
            error_type = 'extraction_error'
        logger.error(f"Extraction terminal error [{error_type}]: {type(e).__name__}: {e}")
        # Capture alleen onverwachte extractie-errors; age_restricted/bot_detection/timeout/youtube_restricted
        # zijn operationele uitkomsten, geen bugs.
        if error_type == 'extraction_error':
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("endpoint", "extract_youtube_transcript")
                scope.set_tag("video_id", video_id)
                scope.set_tag("error_type", error_type)
            sentry_sdk.capture_exception(e)
        return ExtractResponse(
            success=False,
            error=error_msg,
            error_type=error_type
        )

from youtube_client import YouTubeClient

# Initialize YouTube Client
youtube_client = YouTubeClient()

def extract_playlist_id(url: str) -> Optional[str]:
    """Extract playlist ID from YouTube URL."""
    match = re.search(r'[?&]list=([^&]+)', url)
    return match.group(1) if match else None



@app.post("/api/playlist/info", response_model=PlaylistInfoResponse)
async def get_playlist_info(request: ExtractRequest, _: None = Depends(verify_backend_secret)):
    """Fetch playlist metadata using YouTube Data API (primary) or yt-dlp (fallback)."""
    
    # 1. Try YouTube Data API (Industry Standard)
    if youtube_client.youtube:
        playlist_id = extract_playlist_id(request.videoIdOrUrl)
        if playlist_id:
            try:
                logger.info(f"Fetching playlist via API: {playlist_id}")
                import time
                start_time = time.time()
                
                result = youtube_client.get_playlist_items(playlist_id)
                
                duration = time.time() - start_time
                logger.info(f"API Fetch Success: {len(result['entries'])} items in {duration:.2f}s")
                
                return PlaylistInfoResponse(
                    success=True,
                    title=result['title'],
                    entries=[PlaylistEntry(**e) for e in result['entries']],
                    total_count=result['total_count'],
                    unavailable_count=result.get('unavailable_count')
                )
            except Exception as e:
                logger.warning(f"API Fetch failed ({e}). Falling back to yt-dlp.")
                # Fallthrough to yt-dlp
        else:
            logger.warning("Could not extract playlist ID for API. Falling back to yt-dlp.")
    
    # 2. Fallback: yt-dlp (Scraping)
    ydl_opts = {
        'extract_flat': 'in_playlist',  # More robust flat extraction
        'quiet': True,
        'no_warnings': True,
        'playlist_items': '1-500',  # Limit to 500 entries
        'socket_timeout': 10,  # Fail fast on network hang (10s)
        'retries': 3,  # Retry 3 times
        'ignoreerrors': True,  # Skip bad/private videos without failing
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'enabled_runtimes': ['node'],  # Enable node.js for n challenge solving
        'remote_components': ['ejs:github'],  # Download challenge solver script
    }
    
    proxy_url = get_proxy_url()
    if proxy_url:
        ydl_opts['proxy'] = proxy_url
        logger.info(f"Fetching playlist info via yt-dlp (Fallback) WITH proxy: {request.videoIdOrUrl}")
    else:
        logger.info(f"Fetching playlist info via yt-dlp (Fallback) NO proxy: {request.videoIdOrUrl}")
    
    import time
    start_time = time.time()

    # F18: _CountingYoutubeDL tallies the proxied Decodo egress of this scrape. Recorded in `finally`
    # so the bytes count even when extract_info raises — this call spends proxy regardless of outcome.
    _pl_ydl = _CountingYoutubeDL(ydl_opts)
    try:
        with _pl_ydl as ydl:
            info = ydl.extract_info(request.videoIdOrUrl, download=False)

            duration = time.time() - start_time
            logger.info(f"yt-dlp fetched in {duration:.2f} seconds")
            
            if 'entries' not in info:
                return PlaylistInfoResponse(
                    success=False,
                    error="Not a valid playlist URL"
                )
            
            entries = []
            for entry in info.get('entries', []):
                if not entry: continue
                entries.append(PlaylistEntry(
                    id=entry.get('id', ''),
                    title=entry.get('title', 'Unknown Title'),
                    thumbnail=entry.get('thumbnails', [{}])[0].get('url') if entry.get('thumbnails') else None,
                    duration=entry.get('duration')
                ))
            
            # Robust total count check
            total_count = info.get('playlist_count') or info.get('expected_warnings') or len(entries)
            # yt-dlp (ignoreerrors=True) drops private/deleted entries, so any gap
            # between the reported count and the returned entries is genuinely unavailable.
            unavailable_count = max(0, total_count - len(entries))
            logger.info(f"Playlist metadata extracted. Title: {info.get('title')}, Entries: {len(entries)}, Total Count (reported): {total_count}")

            return PlaylistInfoResponse(
                success=True,
                title=info.get('title'),
                entries=entries,
                total_count=total_count,
                unavailable_count=unavailable_count
            )
            
    except Exception as e:
        logger.error(f"Playlist info error: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("endpoint", "get_playlist_info")
            scope.set_tag("cascade_step", "step2_yt-dlp")
        sentry_sdk.capture_exception(e)
        return PlaylistInfoResponse(
            success=False,
            error="Failed to fetch playlist information"
        )
    finally:
        record_proxy_bytes("playlist_info", getattr(_pl_ydl, "egress_read", 0))

@app.get("/api/video/metadata/{video_id}")
async def get_video_metadata(video_id: str, _: None = Depends(verify_backend_secret)):
    """Fetch metadata for a single video using YouTube API (primary) or yt-dlp (fallback)."""
    
    # 1. Try YouTube Data API
    if youtube_client.youtube:
        try:
            result = youtube_client.get_video_details(video_id)
            return result
        except Exception as e:
            logger.warning(f"API Metadata Fetch failed for {video_id}: {e}")
            # Fallthrough
            
    # 2. Fallback: yt-dlp
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'socket_timeout': 10,
        'retries': 3,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    proxy_url = get_proxy_url()
    if proxy_url:
        ydl_opts['proxy'] = proxy_url

    # F18: count the proxied Decodo egress of this metadata scrape (recorded in `finally`, so it counts
    # even when extract_info raises). Uncounted before — this call spends proxy on every fallback.
    _md_ydl = _CountingYoutubeDL(ydl_opts)
    try:
        with _md_ydl as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)

            return {
                "success": True,
                "title": info.get('title', 'Unknown Title'),
                "duration": info.get('duration', 0),
                "thumbnail": info.get('thumbnail') or f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
            }

    except Exception as e:
        logger.error(f"Video metadata error for {video_id}: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("endpoint", "get_video_metadata")
            scope.set_tag("video_id", video_id)
            scope.set_tag("cascade_step", "step2_yt-dlp")
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=404, detail=f"Failed to fetch video metadata: {str(e)}")
    finally:
        record_proxy_bytes("metadata", getattr(_md_ydl, "egress_read", 0))


def _cleanup_tmp(path: Optional[str]) -> None:
    """Ruim een vóór-reserve geschreven upload-temp-bestand op bij een vroege return (402/500)."""
    if path:
        try:
            os.unlink(path)
        except OSError:
            pass


MAX_CONCURRENT_JOBS = 3

# ADR-071 — AssemblyAI hard ceiling is 10 hours of audio (and 5 GB). Above 10h the provider
# fails the job, so AI transcription is rejected above this BEFORE any credit reservation.
# The 5 GB byte limit is covered by the 500 MB upload cap + this 10h duration cap (10h at even
# 128 kbps ≈ 0.6 GB). Caption extraction has NO duration cap.
MAX_TRANSCRIPTION_SECONDS = 10 * 3600  # 36000

# ADR-071 — hard cap on videos per playlist extraction job, enforced on the extract route
# BEFORE the job row + reservation (previously 500 only bit at enumeration; extraction was
# unbounded). Mirrors the 500-item enumeration cap in youtube_client / yt-dlp.
MAX_PLAYLIST_VIDEOS = 500

def _count_active_jobs(supabase, user_id: str) -> int:
    """
    Tel de daadwerkelijk lopende jobs van een user over transcription_jobs +
    playlist_extraction_jobs — voor de concurrency-cap (ADR-050), die VÓÓR elke
    credit-reservering draait. Mirrort de dedup-versheidsfilter (created <30m OF
    heartbeat <10m) zodat zombie/stale jobs (bv. de april-crashes) niet meetellen.
    'interrupted' is een watchdog-herstelstaat → bewust NIET meegeteld.
    Service-role client => geen RLS; daarom expliciet op user_id filteren.
    Houd de statuslijsten in sync met ActiveJobsIndicator (LESSONS: active-job filter).
    """
    fresh_created = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    fresh_hb = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    or_fresh = f'created_at.gt.{fresh_created},last_heartbeat_at.gt.{fresh_hb}'
    tx = (supabase.table('transcription_jobs')
          .select('id', count='exact', head=True)
          .eq('user_id', user_id)
          .in_('status', ['pending', 'downloading', 'transcribing', 'saving'])
          .or_(or_fresh)
          .execute())
    pl = (supabase.table('playlist_extraction_jobs')
          .select('id', count='exact', head=True)
          .eq('user_id', user_id)
          .in_('status', ['running', 'retry_pending'])
          .or_(or_fresh)
          .execute())
    return (tx.count or 0) + (pl.count or 0)


def _too_many_jobs_response() -> JSONResponse:
    return JSONResponse(status_code=429, content={
        "error": f"You have {MAX_CONCURRENT_JOBS} jobs running — wait for one to finish before starting another.",
        "code": "too_many_jobs",
    })


@app.post("/api/transcribe/whisper")
async def transcribe_with_whisper(
    request: Request,
    source_type: str = Form(...),
    video_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    user_id: Optional[str] = Form(None),  # youtube path only (server-to-server); ignored for upload
    duration: Optional[float] = Form(None),  # forwarded by Next.js when known upfront
    _: None = Depends(verify_backend_secret),
):
    """
    Start a Whisper transcription background job.
    Returns immediately with { job_id, status: "pending" }.
    Poll GET /api/jobs/{job_id}?user_id=... for progress and result.
    """
    # Validate source_type
    if source_type not in ["youtube", "upload"]:
        return JSONResponse(status_code=400, content={"error": "Invalid source_type", "code": "invalid_request"})
    if source_type == "youtube" and not video_id:
        return JSONResponse(status_code=400, content={"error": "video_id required for YouTube transcription", "code": "invalid_request"})
    if source_type == "upload" and not audio_file:
        return JSONResponse(status_code=400, content={"error": "audio_file required for upload transcription", "code": "invalid_request"})

    # --- Auth ---
    # Upload path: browser sends Supabase JWT in Authorization header; verify and extract real user_id.
    # YouTube path: Next.js server-to-server call passes user_id as a form field (already auth-checked).
    if source_type == "upload":
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"error": "Authorization required", "code": "unauthorized"})
        token = auth_header[len("Bearer "):]
        _supabase = get_supabase_client()
        try:
            user_response = await asyncio.to_thread(_supabase.auth.get_user, token)
            if not user_response.user:
                return JSONResponse(status_code=401, content={"error": "Invalid or expired token", "code": "unauthorized"})
            user_id = user_response.user.id
        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("endpoint", "transcribe_with_whisper")
                scope.set_tag("auth_step", "jwt_verification")
            sentry_sdk.capture_exception(e)
            return JSONResponse(status_code=401, content={"error": "Authentication failed", "code": "unauthorized"})
        try:
            profile_resp = await asyncio.to_thread(
                lambda: _supabase.table('profiles').select('suspended').eq('id', user_id).single().execute()
            )
            if profile_resp.data and profile_resp.data.get('suspended'):
                return JSONResponse(status_code=403, content={"error": "Account suspended. Contact support@indxr.ai", "code": "suspended"})
        except Exception:
            pass  # Non-fatal: proceed if profile check fails
    elif not user_id:
        return JSONResponse(status_code=400, content={"error": "user_id required for YouTube transcription", "code": "invalid_request"})

    # Read upload bytes now — UploadFile cannot be read inside a background task
    audio_content: Optional[bytes] = None
    audio_filename: Optional[str] = None
    upload_tmp_path: Optional[str] = None   # temp-bestand: één keer geschreven, hergebruikt door de pipeline
    known_duration: Optional[float] = None  # server-side geprobede duur (None => size_fallback => pipeline probet zelf)
    if source_type == "upload" and audio_file:
        audio_content = await audio_file.read()
        audio_filename = audio_file.filename

        # 500MB hard limit
        max_upload_bytes = 500 * 1024 * 1024
        if len(audio_content) > max_upload_bytes:
            return JSONResponse(status_code=413, content={
                "error": f"File too large ({len(audio_content) / 1024 / 1024:.0f}MB). Maximum upload size is 500MB.",
                "code": "file_too_large"
            })

        # ADR-050 — bepaal het reserve-bedrag server-side VÓÓR reserve. De upload-duur is nog niet
        # bekend (bestand wordt pas in de pipeline geprobed) en de client-waarde is onbetrouwbaar
        # (directe JWT-upload), dus zonder deze probe viel estimated_cost terug op 1 = lege gate.
        # Schrijf het bestand één keer naar temp (hergebruikt door de pipeline) en probe het hier.
        suffix = os.path.splitext(audio_filename or "")[1] or ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            upload_tmp_path = tmp.name
        _est = await asyncio.to_thread(estimate_upload_reserve_cost, upload_tmp_path)
        estimated_cost = _est["credits"]
        known_duration = _est["duration"]   # None bij size_fallback → pipeline probet zelf (settle blijft echt)
        logger.info(f"[upload reserve] {audio_filename}: {estimated_cost}cr (source={_est['source']}, dur={known_duration})")
    else:
        # YouTube: de browser stuurt de duur (metadata) mee vóór reserve.
        estimated_cost = calculate_credit_cost(duration) if duration and duration > 0 else 1

    # ADR-071 — DEEL 2: weiger audio boven AssemblyAI's 10-uurs-plafond VÓÓR enige reservering,
    # zodat een user hier nooit credits aan kwijt kan raken. Duur-bron: YouTube-metadata
    # (form-veld) of de server-side upload-probe. Bij een onbekende upload-duur (size_fallback,
    # known_duration None) valt de pipeline terug op zijn eigen probe en refundt bij falen.
    _eff_dur = known_duration if source_type == "upload" else duration
    if _eff_dur and _eff_dur > MAX_TRANSCRIPTION_SECONDS:
        _cleanup_tmp(upload_tmp_path)
        return JSONResponse(status_code=422, content={
            "error": (
                f"This audio is {_eff_dur/3600:.1f} hours long. AI transcription supports up to "
                f"10 hours per file. Caption extraction has no length limit — try that instead, "
                f"or split the audio into shorter parts."
            ),
            "code": "duration_exceeds_max",
            "max_hours": 10,
            "duration_hours": round(_eff_dur/3600, 1),
        })

    try:
        current_balance = await asyncio.to_thread(check_user_balance, user_id)
    except Exception as e:
        _cleanup_tmp(upload_tmp_path)
        return JSONResponse(status_code=500, content={"error": f"Could not check credit balance: {str(e)}"})

    if current_balance < estimated_cost:
        _cleanup_tmp(upload_tmp_path)
        return JSONResponse(status_code=402, content={
            "error": "Insufficient credits",
            "code": "insufficient_credits",
            "required_credits": estimated_cost,
            "available_credits": current_balance
        })

    supabase = get_supabase_client()

    # Deduplicatie: geef bestaande actieve job terug voor dezelfde user + video.
    # Voorkomt gelijktijdige yt-dlp downloads naar /tmp (file-conflict) én dubbele
    # AssemblyAI-calls. Upload-pad is per definitie uniek — alleen YouTube-pad gecheckt.
    # OR-filter sluit stuck/dode jobs uit (defense-in-depth naast watchdog reaper, ADR-049):
    #   created_at < 30min: verse pending job (ARQ pikt op in seconden)
    #   last_heartbeat_at < 10min: actief lopende standalone job
    # Playlist-video-jobs met NULL heartbeat + oude created_at worden correct uitgesloten.
    if source_type == "youtube" and video_id:
        _video_url_check = f"https://www.youtube.com/watch?v={video_id}"
        _dedup_fresh = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        _dedup_hb = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        _existing = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('id,status')
                .eq('user_id', user_id)
                .eq('video_url', _video_url_check)
                .in_('status', ['pending', 'downloading', 'transcribing', 'saving'])
                .or_(f'created_at.gt.{_dedup_fresh},last_heartbeat_at.gt.{_dedup_hb}')
                .limit(1)
                .execute()
        )
        if _existing.data:
            _ex = _existing.data[0]
            logger.info(f"[dedup] Returning existing job {_ex['id']} status={_ex['status']} for {video_id} (user={user_id})")
            return JSONResponse({"job_id": _ex['id'], "status": _ex['status'], "deduplicated": True})

    # Concurrency cap (ADR-050) — reject BEFORE reserving credits, and after dedup so
    # a dedup-hit doesn't count. A denied job never inserts a row and never reserves.
    _active = await asyncio.to_thread(_count_active_jobs, supabase, user_id)
    if _active >= MAX_CONCURRENT_JOBS:
        _cleanup_tmp(upload_tmp_path)
        return _too_many_jobs_response()

    # Insert job row into Supabase transcription_jobs
    job_id = str(uuid.uuid4())
    video_url = f"https://www.youtube.com/watch?v={video_id}" if source_type == "youtube" and video_id else None
    file_size_bytes = len(audio_content) if audio_content else 0
    file_format = (
        os.path.splitext(audio_filename or '')[1].lstrip('.').lower() or 'unknown'
        if source_type == "upload" else "youtube"
    )
    supabase.table('transcription_jobs').insert({
        'id': job_id,
        'user_id': user_id,
        'status': 'pending',
        'video_url': video_url,
        'source_type': source_type,
        'file_size_bytes': file_size_bytes,
        'file_format': file_format,
        # B3: bron-vlag bij aanmaak (voedt Operations). Losse job → upload of single.
        'source_kind': 'upload' if source_type == 'upload' else 'single',
    }).execute()

    # ADR-050 fase 1 — reserveer het geschatte bedrag bij job-start (flag-gated, default OFF).
    # Sluit de concurrent-overspend-race. Flag UIT => overgeslagen => nul gedragswijziging;
    # de bestaande per-video-aftrek blijft dan de enige balans-mutatie (geen dubbele aftrek).
    if RESERVATION_ENABLED:
        _resv = await asyncio.to_thread(
            reserve_credits, user_id=user_id, amount=estimated_cost, job_id=job_id
        )
        if not _resv.get('success'):
            # Reservering geweigerd (concurrent overspend) — job-rij opruimen, niets afgetrokken.
            await asyncio.to_thread(
                lambda: supabase.table('transcription_jobs').delete().eq('id', job_id).execute()
            )
            _cleanup_tmp(upload_tmp_path)
            return JSONResponse(status_code=402, content={
                "error": "Insufficient credits",
                "code": "insufficient_credits",
                "required_credits": estimated_cost,
                "available_credits": _resv.get('available', current_balance),
            })

    if source_type == "youtube":
        arq_pool = request.app.state.arq_pool
        if arq_pool:
            await arq_pool.enqueue_job(
                'run_whisper_job',
                job_id=job_id,
                user_id=user_id,
                video_id=video_id,
                title=title,
            )
        else:
            # Fallback: ARQ_REDIS_URL not configured (local dev without Redis).
            # Reservation-aware wrapper (ADR-050 fase 2): reserve draait hierboven vóór de
            # source_type-splitsing, dus dit directe pipeline-pad MOET reservation-aware zijn
            # mét refund-hook — anders reserve + oude aftrek = dubbele afrekening bij flag ON.
            asyncio.create_task(run_whisper_reservation_aware(
                user_id, video_id,
                job_id=job_id,
                audio_title=title,
            ))
    else:
        # Upload path: bytes not queue-serializable — stays on asyncio.create_task.
        # Het temp-bestand is hierboven al geschreven (upload_tmp_path) om de duur te proben vóór
        # reserve — hergebruik dat (niet opnieuw schrijven). known_duration is de geprobede duur
        # (None bij size_fallback → de pipeline probet zelf → settle blijft op de echte duur).
        # Reservation-aware wrapper (ADR-050 fase 2): reserve is al gebeurd, dus deze directe
        # pipeline-aanroep moet via de wrapper (reservation_mode + refund), anders dubbele aftrek
        # bij flag ON en de reservering wordt nooit teruggeboekt.
        asyncio.create_task(run_whisper_reservation_aware(
            user_id, None,
            job_id=job_id,
            audio_path=upload_tmp_path,
            audio_title=title or audio_filename,
            known_duration_seconds=known_duration,
        ))

    logger.info(f"Whisper job created: {job_id} (user={user_id}, source={source_type}, video={video_id})")
    return JSONResponse({"job_id": job_id, "status": "pending"})


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str, user_id: str, _: None = Depends(verify_backend_secret)):
    """
    Poll a Whisper transcription job.
    Returns job status and, when complete, the full transcript + metadata.
    """
    supabase = get_supabase_client()
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs').select('*').eq('id', job_id).single().execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    job = result.data
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Stale-detectie: alleen als heartbeat aanwezig (NULL = legacy job vóór Fase 4).
    if job['status'] == 'running' and job.get('last_heartbeat_at'):
        hb = datetime.fromisoformat(job['last_heartbeat_at'].replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - hb).total_seconds()
        if age > HEARTBEAT_STALE_SECS:
            try:
                await asyncio.to_thread(
                    lambda: supabase.table('transcription_jobs')
                        .update({'status': 'interrupted'})
                        .eq('id', job_id).execute()
                )
                job['status'] = 'interrupted'
                logger.warning(f"[stale] transcription_jobs {job_id} marked interrupted (heartbeat {age:.0f}s old)")
            except Exception as e:
                logger.error(f"[stale] Failed to mark {job_id} as interrupted: {e}")

    # Fetch transcript data when job is complete
    transcript = None
    channel = None
    language = None
    if job.get('transcript_id'):
        try:
            t_result = await asyncio.to_thread(
                lambda: supabase.table('transcripts').select('transcript,channel,language').eq('id', job['transcript_id']).single().execute()
            )
            if t_result.data:
                transcript = t_result.data.get('transcript')
                channel = t_result.data.get('channel')
                language = t_result.data.get('language')
        except Exception:
            pass

    return JSONResponse({
        "job_id": job_id,
        "status": job['status'],
        "created_at": job.get('created_at'),
        "transcript": transcript,
        "transcript_id": job.get('transcript_id'),
        "channel": channel,
        "language": language,
        "duration": job.get('duration_seconds'),
        "credits_used": job.get('credits_cost'),
        "processing_time_seconds": job.get('processing_time_seconds'),
        "error_message": job.get('error_message'),
        "error_code": None,
        "required_credits": None,
        "available_credits": None,
    })

# AI-summary via the AssemblyAI EU LLM Gateway (OpenAI-compatible, EU data-residency) — ADR-068.
# DeepSeek (China, no DPA/SCC) was unlawful for EU personal data; the gateway keeps processing in the EU.
LLM_GATEWAY_URL = "https://llm-gateway.eu.assemblyai.com/v1/chat/completions"
SUMMARY_MODEL_PRIMARY = "gemini-2.5-flash"
SUMMARY_MODEL_FALLBACK = "claude-haiku-4-5-20251001"


@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_transcript(request: SummarizeRequest, _: None = Depends(verify_backend_secret)):
    """Summarize transcript using the AssemblyAI EU LLM Gateway (Gemini Flash, Haiku fallback)."""
    try:
        # 1. Check balance
        try:
            current_balance = check_user_balance(request.user_id)
        except Exception as e:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("endpoint", "summarize_transcript")
                scope.set_tag("step", "credit_balance_check")
                scope.set_tag("user_id", request.user_id)
            sentry_sdk.capture_exception(e)
            return SummarizeResponse(success=False, error=f"Could not check credit balance: {str(e)}")
            
        if current_balance < 3:
            logger.warning(f"Insufficient credits for summary: user {request.user_id} has {current_balance}, needs 3")
            return SummarizeResponse(success=False, error="Insufficient credits")
        
        # 2. Deduct credit atomically
        deduction_result = deduct_credits(
            user_id=request.user_id,
            amount=3,
            reason="AI Summarization",
            metadata={"transcript_id": request.transcript_id},
            product_type="ai_summary"
        )
        if not deduction_result.get('success'):
            logger.error(f"Credit deduction failed: {deduction_result.get('error')}")
            return SummarizeResponse(success=False, error="Credit deduction failed")

        # Track credits_deducted for summary
        track_event(request.user_id, 'credits_deducted', {
            'amount': 3,
            'reason': 'summary',
            'balance_after': deduction_result.get('new_balance')
        })

        summary_start_time = time.time()

        # 3. Fetch transcript from Supabase
        supabase = get_supabase_client()
        try:
            response = supabase.table('transcripts').select('transcript').eq('id', request.transcript_id).single().execute()
            if not response.data or 'transcript' not in response.data:
                raise Exception("Transcript not found or empty")
            transcript_data = response.data['transcript']
        except Exception as e:
            logger.error(f"Failed to fetch transcript {request.transcript_id}: {e}")
            add_credits(request.user_id, 3, "AI Summarization Refund (Transcript fetch failed)", kind='refund')
            return SummarizeResponse(success=False, error="Transcript not found")
            
        # Combine transcript text
        full_text = " ".join([item['text'] for item in transcript_data if 'text' in item])
        if not full_text.strip():
            add_credits(request.user_id, 3, "AI Summarization Refund (Empty text)", kind='refund')
            return SummarizeResponse(success=False, error="Transcript is empty")
            
        # 4. Call the AssemblyAI EU LLM Gateway (OpenAI-compatible)
        assemblyai_api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not assemblyai_api_key:
            add_credits(request.user_id, 3, "AI Summarization Refund (LLM Gateway API key missing)", kind='refund')
            return SummarizeResponse(success=False, error="LLM Gateway API key not configured")
            
        # AssemblyAI gateway auth: raw API key in `authorization` (no "Bearer"). ZDR TODO: true
        # zero-data-retention needs an executed BAA + the header/project setting confirmed with
        # AssemblyAI (Khidr); EU-residency (this endpoint) + AssemblyAI DPA/SCCs already make it lawful.
        headers = {
            "authorization": assemblyai_api_key,
            "Content-Type": "application/json"
        }
        
        system_prompt = (
            "You are a helpful assistant that summarizes transcripts. "
            "Output JSON with two keys: 'text' (a summary paragraph) and 'action_points' (an array of strings representing key takeaways). "
            "Let the length be determined by the content."
        )
        
        data = {
            "model": SUMMARY_MODEL_PRIMARY,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript:\\n{full_text}"}
            ],
            "response_format": {"type": "json_object"}
        }
        
        import httpx
        from datetime import datetime, timezone
        import json
        
        try:
            with httpx.Client(timeout=120.0) as client:
                logger.info(f"Calling LLM Gateway ({data['model']}) for transcript {request.transcript_id}")
                gw_resp = client.post(LLM_GATEWAY_URL, headers=headers, json=data)
                # One fallback to the Haiku-class model on gateway failure.
                if gw_resp.status_code != 200:
                    logger.warning(f"LLM Gateway {data['model']} -> {gw_resp.status_code}; falling back to {SUMMARY_MODEL_FALLBACK}")
                    data["model"] = SUMMARY_MODEL_FALLBACK
                    gw_resp = client.post(LLM_GATEWAY_URL, headers=headers, json=data)
            
            if gw_resp.status_code != 200:
                logger.error(f"LLM Gateway error: {gw_resp.status_code} {gw_resp.text[:500]}")
                add_credits(request.user_id, 3, "AI Summarization Refund (LLM Gateway Error)", kind='refund')
                return SummarizeResponse(success=False, error="Failed to generate summary")
                
            result_json = gw_resp.json()
            content = result_json['choices'][0]['message']['content']
            # Gemini/Claude via the gateway may wrap JSON in ```json ... ``` fences — strip before parse.
            _s = (content or "").strip()
            if _s.startswith("```"):
                _s = _s[3:]
                if _s[:4].lower() == "json":
                    _s = _s[4:]
                if _s.rstrip().endswith("```"):
                    _s = _s.rstrip()[:-3]
            summary_data = json.loads(_s.strip())

            # OpenAI-compatible usage → the real per-summary COR source (ai_summary_usage_log). Billing
            # stays a flat 3 credits; this is cost-accounting only. No prompt-cache tier on the gateway's
            # Gemini/Claude models (prompt_tokens_details.cached_tokens = 0) → cache_hit_tokens = 0.
            usage = result_json.get('usage') or {}
            ai_summary_usage = {
                "model": data["model"],
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

            ai_summary = {
                "text": summary_data.get("text", ""),
                "action_points": summary_data.get("action_points", []),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "edited": False
            }

            # 5. Save the summary. Token usage is NOT stored on the transcript anymore (ADR-064/065): the
            # authoritative per-run COR source is ai_summary_usage_log (insert below). `ai_summary_usage` is
            # kept as a local dict only to source generated_at/model for that log row.
            update_resp = supabase.table('transcripts').update({
                "ai_summary": ai_summary,
            }).eq('id', request.transcript_id).execute()
            if not update_resp.data:
                logger.warning(f"Could not confirm transcript update for {request.transcript_id}")

            # F2: per-run token log (insert-only) — the authoritative AI-summary COR source. transcripts.ai_summary_usage
            # is UPDATE'd in place on regenerate (only the last run survives) and is read on transcripts.created_at, so it
            # both under-books COR (N runs → 1×) and misattributes it to transcript birth. Each run appends an immutable
            # log row keyed on generated_at instead; _geld_scope reads COR from here. Non-fatal: never fail the user's
            # summary over a cost-accounting write.
            try:
                supabase.table('ai_summary_usage_log').insert({
                    "transcript_id": request.transcript_id,
                    "user_id": request.user_id,
                    "generated_at": ai_summary_usage["generated_at"],
                    "model": ai_summary_usage["model"],
                    "prompt_tokens": usage.get("prompt_tokens") or 0,
                    "completion_tokens": usage.get("completion_tokens") or 0,
                    "cache_hit_tokens": 0,  # no prompt-cache tier on the LLM Gateway
                }).execute()
            except Exception as log_err:
                logger.warning(f"ai_summary_usage_log insert failed for {request.transcript_id}: {log_err}")
                
            logger.info(f"Summary generated and saved for {request.transcript_id}")

            # Track summarization_completed
            processing_time_ms = int((time.time() - summary_start_time) * 1000)
            track_event(request.user_id, 'summarization_completed', {
                'transcript_id': request.transcript_id,
                'processing_time_ms': processing_time_ms
            })

            return SummarizeResponse(success=True, summary=ai_summary)
            
        except Exception as e:
            logger.error(f"LLM Gateway call exception: {type(e).__name__}: {e}")
            add_credits(request.user_id, 3, f"AI Summarization Refund ({type(e).__name__})", kind='refund')
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("endpoint", "summarize_transcript")
                scope.set_tag("step", "llm_gateway_call")
                scope.set_tag("user_id", request.user_id)
                scope.set_tag("transcript_id", request.transcript_id)
            sentry_sdk.capture_exception(e)
            return SummarizeResponse(success=False, error="Failed to generate summary")
            
    except Exception as e:
        logger.error(f"Summarize endpoint error: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("endpoint", "summarize_transcript")
            scope.set_tag("step", "outer_catch")
            scope.set_tag("user_id", request.user_id)
        sentry_sdk.capture_exception(e)
        return SummarizeResponse(success=False, error=str(e))

def _compute_playlist_reservation(video_ids, use_whisper_ids, video_metadata, is_retry=False) -> int:
    """
    Reserveringsbedrag voor een playlist bij job-start (ADR-050 fase 1). Mirrort EXACT de
    per-video aftrek-logica in worker.py (process_playlist_video):
      - caption-video (niet in use_whisper_ids): 1 credit, GRATIS als index < 3
        (worker.py: is_free = video_index < 3 and not is_retry).
      - whisper-video (in use_whisper_ids): ceil(duration/60), min 1, GEEN gratis-korting
        (worker.py negeert is_free in de whisper-branch).
    Duur ontbreekt/0 => min 1 credit (mirror calculate_credit_cost). Bewust GEEN naïeve
    total_videos-3: een whisper-video op index 0-2 verbruikt een gratis-slot zonder korting,
    exact zoals de worker.
    is_retry=True: retry-/retry-all-job — de gratis-3 is al in de originele run verbruikt, dus
    ALLE caption-video's worden belast (mirror worker: is_free = idx<3 and not is_retry).
    """
    whisper_set = set(use_whisper_ids or [])
    meta = video_metadata or {}
    total = 0
    for idx, vid in enumerate(video_ids):
        if vid in whisper_set:
            d = (meta.get(vid) or {}).get('duration')
            total += calculate_credit_cost(d) if d and d > 0 else 1
        elif is_retry or idx >= 3:
            total += 1
    return total


@app.post("/api/playlist/extract")
async def start_playlist_extraction(request: PlaylistExtractRequest, http_request: Request, _: None = Depends(verify_backend_secret)):
    """
    Start a background playlist extraction job.
    Returns immediately with { job_id, status: "running" }.
    Poll GET /api/playlist/jobs/{job_id}?user_id=... for progress.
    """
    if not request.video_ids:
        return JSONResponse(status_code=400, content={"error": "video_ids must not be empty"})

    # ADR-071 — DEEL 3: cap videos per job BEFORE the job row + reservation. Previously 500 only
    # bit at enumeration (playlist/info) while extraction was unbounded. Credit-safe: rejected
    # before any reserve_credits call.
    if len(request.video_ids) > MAX_PLAYLIST_VIDEOS:
        return JSONResponse(status_code=422, content={
            "error": (
                f"This playlist has {len(request.video_ids)} videos selected. INDXR processes up to "
                f"{MAX_PLAYLIST_VIDEOS} videos per job. Select fewer videos, or split the playlist "
                f"into batches of {MAX_PLAYLIST_VIDEOS}."
            ),
            "code": "too_many_videos",
            "max_videos": MAX_PLAYLIST_VIDEOS,
            "selected_videos": len(request.video_ids),
        })

    supabase = get_supabase_client()

    # Concurrency cap (ADR-050) — reject BEFORE the job row + reservation, so a denied
    # job (incl. a retry / retry-all that would exceed the cap) never reserves credits.
    _active = await asyncio.to_thread(_count_active_jobs, supabase, request.user_id)
    if _active >= MAX_CONCURRENT_JOBS:
        return _too_many_jobs_response()

    job_id = str(uuid.uuid4())

    try:
        await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs').insert({
                'id': job_id,
                'user_id': request.user_id,
                'status': 'running',
                'playlist_url': request.playlist_url,
                'playlist_title': request.playlist_title,
                'total_videos': len(request.video_ids),
                'video_ids': request.video_ids,
                'use_whisper_ids': request.use_whisper_ids,
                'collection_id': request.collection_id,
                'video_metadata': request.video_metadata or {},
                'is_retry': request.is_retry,
            }).execute()
        )
    except Exception as e:
        logger.error(f"Failed to create playlist_extraction_jobs row: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("endpoint", "start_playlist_extraction")
            scope.set_tag("user_id", request.user_id)
        sentry_sdk.capture_exception(e)
        return JSONResponse(status_code=500, content={"error": "Failed to create job"})

    # ADR-050 fase 1 — reserveer het geschatte playlist-bedrag bij job-start (flag-gated,
    # default OFF). Bedrag mirrort exact de worker per-video-aftrek. Flag UIT => overgeslagen
    # => nul gedragswijziging; de bestaande per-video-aftrek blijft de enige balans-mutatie.
    if RESERVATION_ENABLED:
        _reserve_amount = _compute_playlist_reservation(
            request.video_ids, request.use_whisper_ids, request.video_metadata, request.is_retry
        )
        _resv = await asyncio.to_thread(
            reserve_credits, user_id=request.user_id, amount=_reserve_amount, playlist_id=job_id
        )
        if not _resv.get('success'):
            # Reservering geweigerd — job-rij opruimen, niets afgetrokken, niets geënqueued.
            await asyncio.to_thread(
                lambda: supabase.table('playlist_extraction_jobs').delete().eq('id', job_id).execute()
            )
            return JSONResponse(status_code=402, content={
                "error": "Insufficient credits",
                "code": "insufficient_credits",
                "required_credits": _reserve_amount,
                "available_credits": _resv.get('available'),
            })

    arq_pool = http_request.app.state.arq_pool
    if arq_pool:
        await arq_pool.enqueue_job(
            'process_playlist_video',
            job_id,
            0,
            _job_id=f"{job_id}:0",
        )
    else:
        logger.error(f"Playlist job {job_id} created but arq_pool not available — cannot enqueue first video")
        return JSONResponse(status_code=503, content={"error": "Queue not available"})

    logger.info(f"Playlist job created: {job_id} (user={request.user_id}, videos={len(request.video_ids)})")
    return JSONResponse({"job_id": job_id, "status": "running"})


@app.get("/api/playlist/jobs/{job_id}")
async def get_playlist_job(job_id: str, user_id: str, _: None = Depends(verify_backend_secret)):
    """Return the full playlist_extraction_jobs row for progress polling."""
    supabase = get_supabase_client()
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs').select('*').eq('id', job_id).single().execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    job = result.data
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Stale-detectie: alleen als heartbeat aanwezig (NULL = legacy job vóór Fase 4).
    if job['status'] == 'running' and job.get('last_heartbeat_at'):
        hb = datetime.fromisoformat(job['last_heartbeat_at'].replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - hb).total_seconds()
        if age > HEARTBEAT_STALE_SECS:
            try:
                await asyncio.to_thread(
                    lambda: supabase.table('playlist_extraction_jobs')
                        .update({'status': 'interrupted'})
                        .eq('id', job_id).execute()
                )
                job['status'] = 'interrupted'
                logger.warning(f"[stale] playlist_extraction_jobs {job_id} marked interrupted (heartbeat {age:.0f}s old)")
            except Exception as e:
                logger.error(f"[stale] Failed to mark {job_id} as interrupted: {e}")

    return JSONResponse(job)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
