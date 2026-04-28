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
from datetime import datetime, timezone
from upstash_redis.asyncio import Redis as UpstashRedis

import yt_dlp
from youtube_utils import get_proxy_url, extract_with_ytdlp
from transcription_pipeline import do_assemblyai_transcription

# Load environment variables
load_dotenv()

# Initialize PostHog
posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = "https://app.posthog.com"


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

# Import Whisper modules
from audio_utils import (
    get_audio_duration,
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
    get_supabase_client
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-backend")
logger.setLevel(logging.INFO)

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration(), HttpxIntegration()],
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.getenv("UPSTASH_REDIS_URL")
    if redis_url:
        app.state.arq_pool = await create_pool(ArqRedisSettings.from_dsn(redis_url))
        logger.info("ARQ pool initialized")
    else:
        app.state.arq_pool = None
        logger.warning("UPSTASH_REDIS_URL not set — YouTube Whisper falls back to asyncio.create_task")
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
        "https://indxr.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ExtractRequest(BaseModel):
    videoIdOrUrl: str

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
    error: Optional[str] = None

class PlaylistExtractRequest(BaseModel):
    video_ids: List[str]
    user_id: str
    collection_id: Optional[str] = None
    use_whisper_ids: List[str] = []
    playlist_title: Optional[str] = None
    playlist_url: Optional[str] = None

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

@app.post("/api/extract/youtube", response_model=ExtractResponse)
async def extract_youtube_transcript(request: ExtractRequest, _: None = Depends(verify_backend_secret)):
    """Extract transcript from YouTube video using yt-dlp."""
    try:
        video_id = extract_video_id(request.videoIdOrUrl)
        cache_key = f"caption:{video_id}:en"
        redis = get_caption_redis()

        # ── Cache read ────────────────────────────────────────────────────────
        if redis:
            try:
                cached_raw = await redis.get(cache_key)
                if cached_raw:
                    result = json.loads(cached_raw)
                    track_event("backend", "caption_cache_hit", {"video_id": video_id, "lang": "en"})
                    logger.info(f"Caption cache HIT: {video_id}")
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

        track_event("backend", "caption_cache_miss", {"video_id": video_id, "lang": "en"})

        # ── yt-dlp extraction ────────────────────────────────────────────────
        session_id = video_id[-8:]
        result = await extract_with_ytdlp(video_id, use_proxy=True, session_id=session_id)

        # result can be a dict (success) or list (empty/failure)
        if isinstance(result, list) or not result:
            logger.warning(f"No captions found for {video_id}")
            return ExtractResponse(
                success=False,
                error="No captions found for this video"
            )

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
                    total_count=result['total_count']
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
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
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
            logger.info(f"Playlist metadata extracted. Title: {info.get('title')}, Entries: {len(entries)}, Total Count (reported): {total_count}")
            
            return PlaylistInfoResponse(
                success=True,
                title=info.get('title'),
                entries=entries,
                total_count=total_count
            )
            
    except Exception as e:
        logger.error(f"Playlist info error: {e}")
        return PlaylistInfoResponse(
            success=False,
            error="Failed to fetch playlist information"
        )

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

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)

            return {
                "success": True,
                "title": info.get('title', 'Unknown Title'),
                "duration": info.get('duration', 0),
                "thumbnail": info.get('thumbnail') or f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
            }

    except Exception as e:
        logger.error(f"Video metadata error for {video_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Failed to fetch video metadata: {str(e)}")

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

    # Credit pre-check: use forwarded duration for accurate cost estimate
    estimated_cost = calculate_credit_cost(duration) if duration and duration > 0 else 1
    try:
        current_balance = await asyncio.to_thread(check_user_balance, user_id)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Could not check credit balance: {str(e)}"})

    if current_balance < estimated_cost:
        return JSONResponse(status_code=402, content={
            "error": "Insufficient credits",
            "code": "insufficient_credits",
            "required_credits": estimated_cost,
            "available_credits": current_balance
        })

    # Insert job row into Supabase transcription_jobs
    job_id = str(uuid.uuid4())
    video_url = f"https://www.youtube.com/watch?v={video_id}" if source_type == "youtube" and video_id else None
    file_size_bytes = len(audio_content) if audio_content else 0
    file_format = (
        os.path.splitext(audio_filename or '')[1].lstrip('.').lower() or 'unknown'
        if source_type == "upload" else "youtube"
    )
    supabase = get_supabase_client()
    supabase.table('transcription_jobs').insert({
        'id': job_id,
        'user_id': user_id,
        'status': 'pending',
        'video_url': video_url,
        'source_type': source_type,
        'file_size_bytes': file_size_bytes,
        'file_format': file_format,
    }).execute()

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
            # Fallback: UPSTASH_REDIS_URL not configured (local dev without Redis)
            asyncio.create_task(do_assemblyai_transcription(
                user_id, video_id,
                job_id=job_id,
                audio_title=title,
            ))
    else:
        # Upload path: bytes not queue-serializable — stays on asyncio.create_task.
        # Write bytes to temp file now (UploadFile cannot be read inside a background task).
        suffix = os.path.splitext(audio_filename or "")[1] or ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        asyncio.create_task(do_assemblyai_transcription(
            user_id, None,
            job_id=job_id,
            audio_path=tmp_path,
            audio_title=title or audio_filename,
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

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_transcript(request: SummarizeRequest, _: None = Depends(verify_backend_secret)):
    """Summarize transcript using DeepSeek V3 chat model."""
    try:
        # 1. Check balance
        try:
            current_balance = check_user_balance(request.user_id)
        except Exception as e:
            return SummarizeResponse(success=False, error=f"Could not check credit balance: {str(e)}")
            
        if current_balance < 3:
            logger.warning(f"Insufficient credits for summary: user {request.user_id} has {current_balance}, needs 3")
            return SummarizeResponse(success=False, error="Insufficient credits")
        
        # 2. Deduct credit atomically
        deduction_result = deduct_credits(
            user_id=request.user_id,
            amount=3,
            reason="AI Summarization",
            metadata={"transcript_id": request.transcript_id}
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
            add_credits(request.user_id, 3, "AI Summarization Refund (Transcript fetch failed)")
            return SummarizeResponse(success=False, error="Transcript not found")
            
        # Combine transcript text
        full_text = " ".join([item['text'] for item in transcript_data if 'text' in item])
        if not full_text.strip():
            add_credits(request.user_id, 3, "AI Summarization Refund (Empty text)")
            return SummarizeResponse(success=False, error="Transcript is empty")
            
        # 4. Call DeepSeek API
        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if not deepseek_api_key:
            add_credits(request.user_id, 3, "AI Summarization Refund (DeepSeek API key missing)")
            return SummarizeResponse(success=False, error="DeepSeek API key not configured")
            
        deepseek_url = "https://api.deepseek.com/chat/completions"
        headers = {
            "Authorization": f"Bearer {deepseek_api_key}",
            "Content-Type": "application/json"
        }
        
        system_prompt = (
            "You are a helpful assistant that summarizes transcripts. "
            "Output JSON with two keys: 'text' (a summary paragraph) and 'action_points' (an array of strings representing key takeaways). "
            "Let the length be determined by the content."
        )
        
        # TODO: model selector - future BYOK feature
        data = {
            "model": "deepseek-chat",
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
                logger.info(f"Calling DeepSeek API for transcript {request.transcript_id}")
                ds_resp = client.post(deepseek_url, headers=headers, json=data)
            
            if ds_resp.status_code != 200:
                logger.error(f"DeepSeek API error: {ds_resp.status_code} {ds_resp.text}")
                add_credits(request.user_id, 3, "AI Summarization Refund (DeepSeek API Error)")
                return SummarizeResponse(success=False, error="Failed to generate summary")
                
            result_json = ds_resp.json()
            content = result_json['choices'][0]['message']['content']
            summary_data = json.loads(content)
            
            ai_summary = {
                "text": summary_data.get("text", ""),
                "action_points": summary_data.get("action_points", []),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "edited": False
            }
            
            # 5. Save to Supabase
            update_resp = supabase.table('transcripts').update({"ai_summary": ai_summary}).eq('id', request.transcript_id).execute()
            if not update_resp.data:
                logger.warning(f"Could not confirm transcript update for {request.transcript_id}")
                
            logger.info(f"Summary generated and saved for {request.transcript_id}")

            # Track summarization_completed
            processing_time_ms = int((time.time() - summary_start_time) * 1000)
            track_event(request.user_id, 'summarization_completed', {
                'transcript_id': request.transcript_id,
                'processing_time_ms': processing_time_ms
            })

            return SummarizeResponse(success=True, summary=ai_summary)
            
        except Exception as e:
            logger.error(f"DeepSeek call exception: {type(e).__name__}: {e}")
            add_credits(request.user_id, 3, f"AI Summarization Refund ({type(e).__name__})")
            return SummarizeResponse(success=False, error="Failed to generate summary")
            
    except Exception as e:
        logger.error(f"Summarize endpoint error: {e}")
        return SummarizeResponse(success=False, error=str(e))

@app.post("/api/playlist/extract")
async def start_playlist_extraction(request: PlaylistExtractRequest, http_request: Request, _: None = Depends(verify_backend_secret)):
    """
    Start a background playlist extraction job.
    Returns immediately with { job_id, status: "running" }.
    Poll GET /api/playlist/jobs/{job_id}?user_id=... for progress.
    """
    if not request.video_ids:
        return JSONResponse(status_code=400, content={"error": "video_ids must not be empty"})

    supabase = get_supabase_client()
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
            }).execute()
        )
    except Exception as e:
        logger.error(f"Failed to create playlist_extraction_jobs row: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to create job"})

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

    return JSONResponse(job)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
