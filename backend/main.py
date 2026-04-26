from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends, Header
from fastapi.responses import JSONResponse
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import re
import uuid
import secrets
import logging
import yt_dlp
import os
import tempfile
import time
from dotenv import load_dotenv
import posthog
from datetime import datetime, timezone
from lingua import Language, LanguageDetectorBuilder

_lingua_detector = (
    LanguageDetectorBuilder
    .from_languages(
        Language.ENGLISH, Language.DUTCH, Language.GERMAN,
        Language.FRENCH, Language.SPANISH, Language.PORTUGUESE,
        Language.ITALIAN, Language.TURKISH, Language.INDONESIAN,
        Language.ARABIC, Language.CHINESE, Language.JAPANESE, Language.KOREAN,
    )
    .build()
)

# Load environment variables
load_dotenv()

# Add deno to PATH so yt-dlp can find it for JS challenge solving
_deno_path = os.getenv("DENO_PATH", "")
if _deno_path and _deno_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _deno_path + ":" + os.environ.get("PATH", "")

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

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration(), HttpxIntegration()],
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
)

app = FastAPI(title="INDXR.AI Backend", version="1.0.0")

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

# Start bgutil PO token HTTP server (Rust binary, no Node/Deno required).
# Guard with a socket probe so only the first uvicorn worker starts it —
# subsequent workers will see the port already bound and skip.
import subprocess as _subprocess
import socket as _socket
def _start_bgutil_server() -> None:
    try:
        with _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM) as _s:
            _s.bind(('127.0.0.1', 4416))
    except OSError:
        return  # Another worker already owns the port
    try:
        result = _subprocess.run(
            ['/usr/local/bin/bgutil-pot', '--version'],
            capture_output=True, text=True, timeout=5
        )
        logger.debug(f"bgutil-pot version: {result.stdout.strip()} {result.stderr.strip()}")
    except Exception as e:
        logger.debug(f"bgutil-pot binary check failed: {e}")
        return
    _subprocess.Popen(
        ['/usr/local/bin/bgutil-pot', 'server', '--host', '127.0.0.1', '--port', '4416'],
        stdout=_subprocess.DEVNULL,
        stderr=_subprocess.DEVNULL,
    )
_start_bgutil_server()

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

# Proxy Configuration (optional — controlled via PROXY_ENABLED in .env)
# Provider-agnostic: supports LunaProxy, IPRoyal, BrightData, etc.
PROXY_HOST = os.getenv("PROXY_HOST", "")
PROXY_PORT = os.getenv("PROXY_PORT", "")
PROXY_USERNAME = os.getenv("PROXY_USERNAME", "")
PROXY_PASSWORD = os.getenv("PROXY_PASSWORD", "")
PROXY_ENABLED = os.getenv("PROXY_ENABLED", "false").lower() == "true"

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

def get_proxy_url(session_id: Optional[str] = None) -> Optional[str]:
    """Build proxy URL from environment config.
    Returns None when PROXY_ENABLED is not 'true' in .env.
    Pass session_id to pin a job to a consistent exit IP (sticky session).
    Omit it for one-off requests — a random 8-char session is generated each call.
    """
    if not PROXY_ENABLED:
        return None
    if not PROXY_USERNAME or not PROXY_PASSWORD or not PROXY_HOST:
        logger.warning("PROXY_ENABLED=true but credentials are missing — running without proxy")
        return None
    sid = session_id or secrets.token_hex(4)
    sticky_user = f"user-{PROXY_USERNAME}-session-{sid}"
    return f"http://{sticky_user}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}"

def find_longest_overlap(text1: str, text2: str) -> int:
    """
    Find longest suffix of text1 that matches prefix of text2.
    Returns the number of overlapping words.
    Industry-standard algorithm for detecting boundary overlaps.
    """
    words1 = text1.split()
    words2 = text2.split()
    
    # Try overlaps from longest to shortest
    for length in range(min(len(words1), len(words2)), 0, -1):
        suffix_words = words1[-length:]
        prefix_words = words2[:length]
        
        if suffix_words == prefix_words:
            return length  # Number of overlapping words
    
    return 0

def remove_overlaps(captions: List[dict]) -> List[dict]:
    """
    Remove overlapping text between consecutive captions.
    Uses Longest Common Substring algorithm to find and remove duplicates.
    Preserves granular timestamps while eliminating all word repetition.
    """
    if not captions:
        return []
    
    result = [captions[0].copy()]  # Keep first caption as-is
    
    for i in range(1, len(captions)):
        prev_caption = result[-1]
        curr_caption = captions[i].copy()
        
        # Find overlap between end of previous and start of current
        overlap_words = find_longest_overlap(
            prev_caption['text'], 
            curr_caption['text']
        )
        
        if overlap_words > 0:
            # Remove overlap from current caption
            words = curr_caption['text'].split()
            curr_caption['text'] = ' '.join(words[overlap_words:])
        
        # Only add if text remains after removing overlap
        if curr_caption['text'].strip():
            result.append(curr_caption)
    
    return result

def parse_timestamp(timestamp: str) -> float:
    """Convert timestamp string to seconds."""
    parts = timestamp.split(':')
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
    elif len(parts) == 2:
        minutes, seconds = parts
        return float(minutes) * 60 + float(seconds)
    else:
        return float(parts[0])

def parse_vtt_to_transcript(subtitle_data: str) -> List[dict]:
    """Parse VTT subtitle format with overlap-merging and deduplication."""
    raw_entries = []
    lines = subtitle_data.strip().split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if '-->' in line:
            try:
                start_str, end_str = line.split('-->')
                start_time = parse_timestamp(start_str.strip())
                end_time = parse_timestamp(end_str.strip())
                duration = end_time - start_time
                
                i += 1
                text_parts = []
                while i < len(lines) and lines[i].strip() and '-->' not in lines[i]:
                    text_parts.append(lines[i].strip())
                    i += 1
                
                raw_text = ' '.join(text_parts)
                clean_text = re.sub(r'<\d{2}:\d{2}:\d{2}\.\d{3}>', '', raw_text)
                clean_text = re.sub(r'<[^>]+>', '', clean_text)
                clean_text = ' '.join(clean_text.split())
                
                if clean_text:
                    raw_entries.append({
                        'text': clean_text,
                        'offset': start_time,
                        'duration': max(duration, 0.1)
                    })
            except Exception as e:
                logger.error(f"Error parsing subtitle line: {line} - {e}")
        
        i += 1
    
    if not raw_entries:
        return []
    
    # Step 1: Sort by offset
    raw_entries.sort(key=lambda x: x['offset'])
    
    # Step 2: Remove overlapping text using Longest Common Substring algorithm
    cleaned_entries = remove_overlaps(raw_entries)
    
    # Step 3: Remove obvious substring duplicates while building final transcript
    # We maintain granularity by only removing items that are fully contained 
    # within others, while preserving the sequence.
    final_transcript = []
    seen_texts = set()
    
    for i, entry in enumerate(cleaned_entries):
        text = entry['text']
        
        # Performance: Use a sliding window check for substrings (prev, current, next)
        # instead of a global O(N^2) check, as YouTube VTT overlaps are local.
        is_redundant = False
        
        # Check if already seen or is just a fragment of previous/next
        if text in seen_texts:
            is_redundant = True
        else:
            # Look ahead/behind for substring matches (common in VTT buildup)
            look_range = range(max(0, i-2), min(len(cleaned_entries), i+3))
            for check_idx in look_range:
                if check_idx == i: continue
                other_text = cleaned_entries[check_idx]['text']
                if text != other_text and text in other_text:
                    is_redundant = True
                    break
        
        if not is_redundant:
            # Calculate duration based on next entry's offset
            next_offset = None
            if i + 1 < len(cleaned_entries):
                next_offset = cleaned_entries[i+1]['offset']
            
            calculated_duration = (next_offset - entry['offset']) if next_offset else entry['duration']
            
            final_transcript.append({
                'text': text,
                'offset': entry['offset'],
                'duration': max(calculated_duration, 0.1)
            })
            seen_texts.add(text)
    
    return final_transcript

async def extract_with_ytdlp(video_id: str, use_proxy: bool = True, session_id: Optional[str] = None) -> List[dict]:
    """Extract transcript using yt-dlp."""
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'socket_timeout': 10,  # Fail fast
        'retries': 3,
        'enabled_runtimes': ['node', 'deno'],  # Enable node.js/deno for n challenge solving
        'remote_components': ['ejs:github'],  # Download challenge solver script
    }
    
    if use_proxy:
        proxy_url = get_proxy_url(session_id=session_id)
        if proxy_url:
            ydl_opts['proxy'] = proxy_url
            logger.info("Using proxy for extraction")
        else:
            logger.info("Proxy disabled — extracting directly (no proxy)")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            subtitles = None
            if 'subtitles' in info and info['subtitles'] and 'en' in info['subtitles']:
                subtitles = info['subtitles']['en']
            elif 'automatic_captions' in info and info['automatic_captions'] and 'en' in info['automatic_captions']:
                subtitles = info['automatic_captions']['en']
            
            if not subtitles:
                return []
            
            vtt_subtitle = None
            for sub in subtitles:
                if sub.get('ext') == 'vtt':
                    vtt_subtitle = sub
                    break
            
            if not vtt_subtitle:
                return []
            
            subtitle_url = vtt_subtitle['url']

            import httpx
            import time

            max_retries = 3
            subtitle_data = None
            proxy_url = get_proxy_url(session_id=session_id) if use_proxy else None

            for attempt in range(max_retries):
                try:
                    kwargs = {"timeout": 15.0}
                    if proxy_url:
                        kwargs["proxy"] = proxy_url

                    with httpx.Client(**kwargs) as client:
                        resp = client.get(subtitle_url)
                        resp.raise_for_status()
                        subtitle_data = resp.text
                        break
                except Exception as e:
                    logger.warning(f"VTT download attempt {attempt+1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise Exception(f"Failed to download subtitles after {max_retries} attempts: {e}")
                    time.sleep(1)
            
            if not subtitle_data:
                return []
            
            transcript = parse_vtt_to_transcript(subtitle_data)

            raw_language = info.get('language')
            language_detected = None
            if raw_language:
                language = raw_language[:2].lower()
                language_detected = False
            else:
                sample = ' '.join(item['text'] for item in transcript[:80])
                sample = ' '.join(sample.split()[:500])
                try:
                    detected = _lingua_detector.detect_language_of(sample)
                    if detected:
                        language = detected.iso_code_639_1.name.lower()
                        language_detected = True
                    else:
                        language = None
                except Exception:
                    language = None

            raw_date = info.get('upload_date')
            iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}" if raw_date else None

            return {
                'transcript': transcript,
                'title': info.get('title'),
                'video_url': info.get('webpage_url'),
                'duration': info.get('duration'),
                'channel': info.get('uploader'),
                'language': language,
                'language_detected': language_detected,
                'upload_date': iso_date,
            }
            
    except MembersOnlyVideoError:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
            logger.warning(f"Members-only video detected during caption extraction: {video_id}")
            raise MembersOnlyVideoError("This video is only available to channel members and cannot be transcribed.")
        logger.error(f"yt-dlp extraction error: {type(e).__name__}: {e}")
        raise Exception(f"yt-dlp extraction failed: {str(e)}")

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
        'enabled_runtimes': ['node', 'deno'],  # Enable node.js/deno for n challenge solving
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

async def run_whisper_job(
    job_id: str,
    user_id: str,
    source_type: str,
    video_id: Optional[str],
    audio_content: Optional[bytes],
    audio_filename: Optional[str],
    title: Optional[str] = None,
) -> None:
    """
    Background task: runs the full transcription pipeline and updates transcription_jobs in Supabase.
    Credits are deducted after audio is downloaded (duration is needed for cost calculation).
    On any failure after deduction, credits are refunded automatically.
    """
    temp_files: list = []
    credit_cost = 0
    credits_deducted = False
    supabase = get_supabase_client()
    job_started_at = datetime.now(timezone.utc)

    async def update_job(**kwargs):
        now = datetime.now(timezone.utc)
        kwargs['updated_at'] = now.isoformat()
        if kwargs.get('status') in ('complete', 'error') and 'completed_at' not in kwargs:
            kwargs['completed_at'] = now.isoformat()
            kwargs['processing_time_seconds'] = int((now - job_started_at).total_seconds())
        await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs').update(kwargs).eq('id', job_id).execute()
        )

    try:
        audio_path: Optional[str] = None
        video_title = title or video_id or 'Untitled'  # default; overridden by yt-dlp for youtube path
        channel: Optional[str] = None
        language: Optional[str] = None

        # --- Step 1: Get audio ---
        if source_type == "youtube":
            await update_job(status="downloading", started_at=job_started_at.isoformat())
            logger.info(f"[job {job_id}] Downloading YouTube audio for video: {video_id}")
            try:
                proxy_url = get_proxy_url(session_id=job_id[:8])
                if proxy_url:
                    logger.info(f"[job {job_id}] Proxy ENABLED for video {video_id}")
                else:
                    logger.warning(f"[job {job_id}] Proxy DISABLED — PROXY_ENABLED={PROXY_ENABLED}")
                audio_path, video_title, channel = await asyncio.to_thread(extract_youtube_audio, video_id, proxy_url=proxy_url)
                temp_files.append(audio_path)
            except MembersOnlyVideoError:
                await update_job(status="error", error_message="members_only")
                return
            except Exception as e:
                error_msg = str(e)
                error_lower = error_msg.lower()
                if any(kw in error_lower for kw in MEMBERS_ONLY_KEYWORDS):
                    await update_job(status="error", error_message="members_only")
                    return
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
                track_event(user_id, 'whisper_failed', {
                    'video_id': video_id,
                    'source_type': source_type,
                    'error_type': error_type,
                    'error_message': error_msg
                })
                await update_job(status="error", error_message=error_msg, error_type=error_type)
                return
        else:
            logger.info(f"[job {job_id}] Writing uploaded audio to temp file: {audio_filename}")
            suffix = os.path.splitext(audio_filename or "")[1] or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(audio_content)
                audio_path = tmp.name
                temp_files.append(audio_path)
            video_title = title or audio_filename or 'Untitled'

        # --- Step 2: Validate audio ---
        validation = await asyncio.to_thread(validate_audio_file, audio_path)
        if not validation['valid']:
            await update_job(status="error", error_message=validation['error'])
            return

        # --- Step 3: Duration ---
        try:
            duration = await asyncio.to_thread(get_audio_duration, audio_path)
        except Exception as e:
            await update_job(status="error", error_message=f"Could not determine audio duration: {str(e)}")
            return

        # --- Step 4: Credit check and deduction ---
        credit_cost = calculate_credit_cost(duration)
        try:
            current_balance = await asyncio.to_thread(check_user_balance, user_id)
        except Exception as e:
            await update_job(status="error", error_message=f"Could not check credit balance: {str(e)}")
            return

        if current_balance < credit_cost:
            logger.warning(f"[job {job_id}] Insufficient credits: user has {current_balance}, needs {credit_cost}")
            await update_job(status="error", error_message="Insufficient credits")
            return

        metadata = {
            'source_type': source_type,
            'duration_seconds': duration,
            'video_id': video_id if source_type == 'youtube' else None,
            'filename': audio_filename if source_type == 'upload' else None,
            'job_id': job_id
        }
        deduction_result = await asyncio.to_thread(
            deduct_credits,
            user_id=user_id,
            amount=credit_cost,
            reason="AssemblyAI transcription",
            metadata=metadata
        )
        if not deduction_result.get('success'):
            logger.error(f"[job {job_id}] Credit deduction failed: {deduction_result.get('error')}")
            await update_job(status="error", error_message="Credit deduction failed")
            return
        credits_deducted = True
        track_event(user_id, 'credits_deducted', {
            'amount': credit_cost, 'reason': 'whisper',
            'balance_after': deduction_result.get('new_balance')
        })

        # --- Step 5: Compress if needed (>25MB) ---
        if validation['size_mb'] > 25:
            logger.info(f"[job {job_id}] Audio exceeds 25MB, compressing...")
            try:
                compressed_path = await asyncio.to_thread(compress_audio_if_needed, audio_path)
                if compressed_path != audio_path:
                    temp_files.append(compressed_path)
                    audio_path = compressed_path
            except Exception as e:
                await update_job(status="error", error_message=f"Audio compression failed: {str(e)}")
                return

        # --- Step 6: Transcribe ---
        await update_job(status="transcribing", started_at=job_started_at.isoformat())
        logger.info(f"[job {job_id}] Calling AssemblyAI for {duration:.2f}s audio ({credit_cost} credits)")
        whisper_start_time = time.time()

        track_event(user_id, 'whisper_started', {
            'video_id': video_id, 'source_type': source_type, 'duration_seconds': duration
        })

        whisper_result = await asyncio.to_thread(transcribe_with_assemblyai, str(audio_path))

        if not whisper_result['success']:
            logger.error(f"[job {job_id}] Whisper API failed: {whisper_result['error']}")
            track_event(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': source_type,
                'error_type': 'api_error', 'error_message': whisper_result['error']
            })
            await update_job(status="error", error_message=whisper_result['error'])
            return

        if not whisper_result.get('transcript'):
            logger.warning(f"[job {job_id}] Whisper returned empty transcript — no speech detected")
            track_event(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': source_type,
                'error_type': 'no_speech', 'error_message': 'no_speech_detected'
            })
            await update_job(status="error", error_message="no_speech_detected")
            return

        # --- Step 7: Save transcript to Supabase, then mark job complete ---
        await update_job(status="saving")

        transcript = [
            {'text': item['text'], 'offset': item['offset'], 'duration': item['duration']}
            for item in whisper_result['transcript']
        ]

        # Truncation detection: check if Whisper covered the full audio
        audio_duration = whisper_result.get('duration', 0)
        last_segment = transcript[-1] if transcript else None
        transcript_end = (last_segment['offset'] + last_segment['duration']) if last_segment else 0
        gap = audio_duration - transcript_end if audio_duration > 0 else 0
        truncation_warning = (
            f"Transcript may be incomplete — last {int(gap)} seconds of audio were not transcribed."
            if gap > 60 else None
        )
        if truncation_warning:
            logger.warning(f"[job {job_id}] Truncation detected: audio={audio_duration:.1f}s, transcript_end={transcript_end:.1f}s, gap={gap:.1f}s")

        processing_time_ms = int((time.time() - whisper_start_time) * 1000)
        track_event(user_id, 'whisper_completed', {
            'video_id': video_id, 'source_type': source_type,
            'duration_seconds': duration, 'processing_time_ms': processing_time_ms,
            'credits_used': credit_cost
        })

        # Detect language from whisper transcript using lingua
        sample_text = ' '.join(item['text'] for item in transcript[:20])
        if sample_text.strip():
            detected_lang = _lingua_detector.detect_language_of(sample_text)
            if detected_lang:
                language = detected_lang.iso_code_639_1.name.lower()

        character_count = sum(len(item.get('text', '')) for item in transcript)
        insert_data: dict = {
            'user_id': user_id,
            'video_id': video_id,
            'title': video_title,
            'transcript': transcript,
            'duration': int(duration),
            'processing_method': 'assemblyai',
            'character_count': character_count,
        }
        if channel:
            insert_data['channel'] = channel
        if language:
            insert_data['language'] = language
        transcript_insert = await asyncio.to_thread(
            lambda: supabase.table('transcripts').insert(insert_data).execute()
        )
        transcript_id = transcript_insert.data[0]['id']

        job_completed_at = datetime.now(timezone.utc)
        processing_time_seconds = (job_completed_at - job_started_at).total_seconds()
        logger.info(f"[job {job_id}] Complete: {len(transcript)} segments, {credit_cost} credits deducted, transcript_id={transcript_id}, processing_time={processing_time_seconds:.1f}s")
        await update_job(
            status="complete",
            transcript_id=transcript_id,
            duration_seconds=int(duration),
            credits_cost=credit_cost,
            completed_at=job_completed_at.isoformat(),
            processing_time_seconds=int(processing_time_seconds),
            **({"error_message": truncation_warning} if truncation_warning else {}),
        )
        credits_deducted = False  # Success — do not refund

    except Exception as e:
        logger.error(f"[job {job_id}] Unexpected error: {type(e).__name__}: {e}")
        try:
            job_completed_at = datetime.now(timezone.utc)
            await update_job(
                status="error",
                error_message=f"Internal error: {str(e)}",
                completed_at=job_completed_at.isoformat(),
                processing_time_seconds=int((job_completed_at - job_started_at).total_seconds()),
            )
        except Exception:
            pass

    finally:
        # Refund credits if they were deducted before the failure
        if credits_deducted and credit_cost > 0:
            try:
                refund_reason = f"whisper_timeout | job_id={job_id}"
                await asyncio.to_thread(add_credits, user_id, credit_cost, refund_reason)
                logger.info(f"[job {job_id}] Refunded {credit_cost} credits to user {user_id}")
            except Exception as e:
                logger.error(f"[job {job_id}] Failed to refund {credit_cost} credits: {e}")

        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.warning(f"[job {job_id}] Failed to clean up temp file {temp_file}: {e}")


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

    asyncio.create_task(run_whisper_job(
        job_id=job_id,
        user_id=user_id,
        source_type=source_type,
        video_id=video_id,
        audio_content=audio_content,
        audio_filename=audio_filename,
        title=title,
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

def _classify_error_type(error_msg: str) -> str:
    """Map an error message string to a canonical error_type slug."""
    lower = error_msg.lower()
    if any(kw in lower for kw in MEMBERS_ONLY_KEYWORDS):
        return 'members_only'
    if any(kw in lower for kw in ('age-restricted', 'age restricted', 'confirm your age')):
        return 'age_restricted'
    if any(kw in lower for kw in ('sign in to confirm', 'not a bot', '429', 'too many requests')):
        return 'bot_detection'
    if any(kw in lower for kw in ('timed out', 'timeout', 'read timed out', '504')):
        return 'timeout'
    if '152' in error_msg or 'unavailable' in lower:
        return 'youtube_restricted'
    return 'extraction_error'


async def run_playlist_job(job_id: str, payload: dict) -> None:
    """
    Background task: sequentially extracts transcripts for every video in a playlist job.
    Updates playlist_extraction_jobs progress after each video.
    """
    supabase = get_supabase_client()
    video_ids: List[str] = payload["video_ids"]
    user_id: str = payload["user_id"]
    collection_id: Optional[str] = payload.get("collection_id")
    use_whisper_set = set(payload.get("use_whisper_ids", []))
    job_started_at = datetime.now(timezone.utc)

    async def update_playlist_job(**kwargs):
        await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs').update(kwargs).eq('id', job_id).execute()
        )

    video_results: Dict[str, dict] = {}
    completed = 0
    failed = 0

    try:
        for idx, video_id in enumerate(video_ids):
            await update_playlist_job(current_video_index=idx, current_video_title=f"Loading video {idx + 1} of {len(video_ids)}...")
            logger.info(f"[playlist job {job_id}] Processing video {idx + 1}/{len(video_ids)}: {video_id}")

            try:
                if video_id in use_whisper_set:
                    # --- Whisper path: spawn a transcription_jobs row and run inline ---
                    whisper_job_id = str(uuid.uuid4())
                    vid = video_id
                    await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs').insert({
                            'id': whisper_job_id,
                            'user_id': user_id,
                            'status': 'pending',
                            'video_url': f'https://www.youtube.com/watch?v={vid}',
                            'source_type': 'youtube',
                            'file_size_bytes': 0,
                            'file_format': 'youtube',
                        }).execute()
                    )
                    await run_whisper_job(
                        job_id=whisper_job_id,
                        user_id=user_id,
                        source_type='youtube',
                        video_id=video_id,
                        audio_content=None,
                        audio_filename=None,
                    )
                    job_row = await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs')
                            .select('status,transcript_id,error_message,error_type')
                            .eq('id', whisper_job_id)
                            .single()
                            .execute()
                    )
                    job_data = job_row.data or {}
                    if job_data.get('status') == 'complete' and job_data.get('transcript_id'):
                        transcript_id = job_data['transcript_id']
                        if collection_id:
                            cid = collection_id
                            tid = transcript_id
                            await asyncio.to_thread(
                                lambda: supabase.table('transcripts')
                                    .update({'collection_id': cid})
                                    .eq('id', tid)
                                    .execute()
                            )
                        t_row = await asyncio.to_thread(
                            lambda: supabase.table('transcripts')
                                .select('title')
                                .eq('id', transcript_id)
                                .single()
                                .execute()
                        )
                        title = (t_row.data or {}).get('title', video_id)
                        video_results[video_id] = {'status': 'success', 'transcript_id': transcript_id}
                        await update_playlist_job(current_video_title=title)
                        completed += 1
                    else:
                        err = job_data.get('error_message') or ''
                        error_type = job_data.get('error_type') or _classify_error_type(err)
                        video_results[video_id] = {'status': 'error', 'error_type': error_type}
                        failed += 1

                else:
                    # --- Captions path: extract via yt-dlp and save directly ---
                    # First 3 videos (idx 0-2) are always free; videos 4+ cost 1 credit each.
                    is_free = idx < 3
                    if not is_free:
                        balance = await asyncio.to_thread(check_user_balance, user_id)
                        if balance < 1:
                            video_results[video_id] = {'status': 'error', 'error_type': 'insufficient_credits'}
                            failed += 1
                            await update_playlist_job(completed=completed, failed=failed, video_results=video_results)
                            continue
                    video_session_id = f"{job_id[:4]}{idx:04d}"
                    result = await extract_with_ytdlp(video_id, use_proxy=True, session_id=video_session_id)
                    if isinstance(result, list) or not result:
                        video_results[video_id] = {'status': 'error', 'error_type': 'no_captions'}
                        failed += 1
                    else:
                        if not is_free:
                            await asyncio.to_thread(
                                deduct_credits,
                                user_id=user_id,
                                amount=1,
                                reason="Playlist caption extraction",
                                metadata={'job_id': job_id, 'video_id': video_id}
                            )
                        transcript = result['transcript']
                        title = result.get('title') or video_id
                        char_count = sum(len(x['text']) for x in transcript)
                        duration = int(max(
                            (x['offset'] + x['duration'] for x in transcript),
                            default=0
                        ))
                        insert_data: dict = {
                            'user_id': user_id,
                            'source_type': 'youtube',
                            'title': title,
                            'transcript': transcript,
                            'duration': duration,
                            'character_count': char_count,
                            'video_id': video_id,
                            'thumbnail_url': f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg',
                            'processing_method': 'youtube_captions',
                        }
                        if collection_id:
                            insert_data['collection_id'] = collection_id
                        t = await asyncio.to_thread(
                            lambda data=insert_data: supabase.table('transcripts').insert(data).execute()
                        )
                        transcript_id = t.data[0]['id']
                        video_results[video_id] = {'status': 'success', 'transcript_id': transcript_id, 'free': is_free}
                        await update_playlist_job(current_video_title=title)
                        completed += 1

            except MembersOnlyVideoError:
                video_results[video_id] = {'status': 'error', 'error_type': 'members_only'}
                failed += 1
            except Exception as e:
                error_type = _classify_error_type(str(e))
                video_results[video_id] = {'status': 'error', 'error_type': error_type}
                failed += 1
                logger.warning(f"[playlist job {job_id}] video {video_id} failed ({error_type}): {e}")

            await update_playlist_job(completed=completed, failed=failed, video_results=video_results)

        # --- Retry pass: bot_detection and timeout (once, after 30s) ---
        retry_ids = [
            v for v, res in video_results.items()
            if res.get('error_type') in ('bot_detection', 'timeout')
        ]
        if retry_ids:
            logger.info(f"[playlist job {job_id}] Retrying {len(retry_ids)} video(s) after 30s delay")
            await asyncio.sleep(30)
            for vid in retry_ids:
                logger.info(f"[playlist job {job_id}] Retry: {vid}")
                try:
                    if vid in use_whisper_set:
                        whisper_job_id = str(uuid.uuid4())
                        await asyncio.to_thread(
                            lambda vid=vid, wjid=whisper_job_id: supabase.table('transcription_jobs').insert({
                                'id': wjid,
                                'user_id': user_id,
                                'status': 'pending',
                                'video_url': f'https://www.youtube.com/watch?v={vid}',
                                'source_type': 'youtube',
                                'file_size_bytes': 0,
                                'file_format': 'youtube',
                            }).execute()
                        )
                        await run_whisper_job(
                            job_id=whisper_job_id,
                            user_id=user_id,
                            source_type='youtube',
                            video_id=vid,
                            audio_content=None,
                            audio_filename=None,
                        )
                        job_row = await asyncio.to_thread(
                            lambda wjid=whisper_job_id: supabase.table('transcription_jobs')
                                .select('status,transcript_id,error_message,error_type')
                                .eq('id', wjid)
                                .single()
                                .execute()
                        )
                        job_data = job_row.data or {}
                        if job_data.get('status') == 'complete' and job_data.get('transcript_id'):
                            transcript_id = job_data['transcript_id']
                            if collection_id:
                                await asyncio.to_thread(
                                    lambda cid=collection_id, tid=transcript_id: supabase.table('transcripts')
                                        .update({'collection_id': cid})
                                        .eq('id', tid)
                                        .execute()
                                )
                            t_row = await asyncio.to_thread(
                                lambda tid=transcript_id: supabase.table('transcripts')
                                    .select('title')
                                    .eq('id', tid)
                                    .single()
                                    .execute()
                            )
                            title = (t_row.data or {}).get('title', vid)
                            video_results[vid] = {'status': 'success', 'transcript_id': transcript_id}
                            failed -= 1
                            completed += 1
                        else:
                            err = job_data.get('error_message') or ''
                            error_type = job_data.get('error_type') or _classify_error_type(err)
                            video_results[vid] = {'status': 'error', 'error_type': error_type}
                    else:
                        orig_idx = video_ids.index(vid)
                        video_session_id = f"{job_id[:4]}{orig_idx:04d}"
                        result = await extract_with_ytdlp(vid, use_proxy=True, session_id=video_session_id)
                        if isinstance(result, dict) and 'transcript' in result:
                            is_free = orig_idx < 3
                            transcript = result['transcript']
                            title = result.get('title') or vid
                            char_count = sum(len(x['text']) for x in transcript)
                            duration = int(max(
                                (x['offset'] + x['duration'] for x in transcript),
                                default=0
                            ))
                            insert_data: dict = {
                                'user_id': user_id,
                                'source_type': 'youtube',
                                'title': title,
                                'transcript': transcript,
                                'duration': duration,
                                'character_count': char_count,
                                'video_id': vid,
                                'thumbnail_url': f'https://img.youtube.com/vi/{vid}/mqdefault.jpg',
                                'processing_method': 'youtube_captions',
                            }
                            if collection_id:
                                insert_data['collection_id'] = collection_id
                            t = await asyncio.to_thread(
                                lambda data=insert_data: supabase.table('transcripts').insert(data).execute()
                            )
                            transcript_id = t.data[0]['id']
                            if not is_free:
                                await asyncio.to_thread(
                                    deduct_credits,
                                    user_id=user_id,
                                    amount=1,
                                    reason="Playlist caption extraction (retry)",
                                    metadata={'job_id': job_id, 'video_id': vid}
                                )
                            video_results[vid] = {'status': 'success', 'transcript_id': transcript_id, 'free': is_free}
                            failed -= 1
                            completed += 1
                        else:
                            video_results[vid] = {'status': 'error', 'error_type': 'no_captions'}
                except MembersOnlyVideoError:
                    video_results[vid] = {'status': 'error', 'error_type': 'members_only'}
                except Exception as e:
                    error_type = _classify_error_type(str(e))
                    video_results[vid] = {'status': 'error', 'error_type': error_type}
                    logger.warning(f"[playlist job {job_id}] retry {vid} failed ({error_type}): {e}")
            await update_playlist_job(completed=completed, failed=failed, video_results=video_results)

        now = datetime.now(timezone.utc)
        await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs').update({
                'status': 'complete',
                'completed_at': now.isoformat(),
                'processing_time_seconds': int((now - job_started_at).total_seconds()),
            }).eq('id', job_id).execute()
        )
        logger.info(f"[playlist job {job_id}] Complete: {completed} succeeded, {failed} failed")

    except Exception as e:
        logger.error(f"[playlist job {job_id}] Unexpected error: {type(e).__name__}: {e}")
        try:
            await asyncio.to_thread(
                lambda: supabase.table('playlist_extraction_jobs').update({
                    'status': 'error',
                    'completed_at': datetime.now(timezone.utc).isoformat(),
                }).eq('id', job_id).execute()
            )
        except Exception:
            pass


@app.post("/api/playlist/extract")
async def start_playlist_extraction(request: PlaylistExtractRequest, _: None = Depends(verify_backend_secret)):
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

    asyncio.create_task(run_playlist_job(job_id, request.dict()))
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
