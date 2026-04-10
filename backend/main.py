from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
import asyncio
import json
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import re
import uuid
import logging
import yt_dlp
import urllib.request
import os
import tempfile
import time
from dotenv import load_dotenv
import posthog
from datetime import datetime, timezone

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

app = FastAPI(title="INDXR.AI Backend", version="1.0.0")

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
    error: Optional[str] = None

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

def get_proxy_url() -> Optional[str]:
    """Build proxy URL from environment config.
    Returns None when PROXY_ENABLED is not 'true' in .env.
    """
    if not PROXY_ENABLED:
        return None
    if not PROXY_USERNAME or not PROXY_PASSWORD or not PROXY_HOST:
        logger.warning("PROXY_ENABLED=true but credentials are missing — running without proxy")
        return None
    return f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}"

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

async def extract_with_ytdlp(video_id: str, use_proxy: bool = True) -> List[dict]:
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
        proxy_url = get_proxy_url()
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
            proxy_url = get_proxy_url() if use_proxy else None
            
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
            return {
                'transcript': transcript,
                'title': info.get('title'),
                'video_url': info.get('webpage_url'),
                'duration': info.get('duration')
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
async def extract_youtube_transcript(request: ExtractRequest):
    """Extract transcript from YouTube video using yt-dlp."""
    try:
        video_id = extract_video_id(request.videoIdOrUrl)
        result = await extract_with_ytdlp(video_id, use_proxy=True)
        
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
            duration=result.get('duration')
        )
        
    except MembersOnlyVideoError:
        return JSONResponse(
            status_code=403,
            content={"success": False, "error": "members_only", "message": "This video is only available to channel members and cannot be transcribed."}
        )
    except Exception as e:
        logger.error(f"Extraction terminal error: {type(e).__name__}: {e}")
        return ExtractResponse(
            success=False,
            error="Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"
        )

from youtube_client import YouTubeClient

# Initialize YouTube Client
youtube_client = YouTubeClient()

def extract_playlist_id(url: str) -> Optional[str]:
    """Extract playlist ID from YouTube URL."""
    match = re.search(r'[?&]list=([^&]+)', url)
    return match.group(1) if match else None

def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from YouTube URL."""
    # Handle various formats: ?v=ID, youtu.be/ID, embed/ID
    if len(url) == 11 and ' ' not in url: # Direct ID
        return url
        
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/|v\/|youtu.be\/)([0-9A-Za-z_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@app.post("/api/playlist/info", response_model=PlaylistInfoResponse)
async def get_playlist_info(request: ExtractRequest):
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
async def get_video_metadata(video_id: str):
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
        'enabled_runtimes': ['node', 'deno'],  # Enable node.js/deno for n challenge solving
        'remote_components': ['ejs:github'],  # Download challenge solver script
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
) -> None:
    """
    Background task: runs the full Whisper pipeline and updates whisper_jobs in Supabase.
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
            lambda: supabase.table('whisper_jobs').update(kwargs).eq('id', job_id).execute()
        )

    try:
        audio_path: Optional[str] = None

        # --- Step 1: Get audio ---
        if source_type == "youtube":
            await update_job(status="downloading", started_at=job_started_at.isoformat())
            logger.info(f"[job {job_id}] Downloading YouTube audio for video: {video_id}")
            try:
                proxy_url = get_proxy_url()
                if proxy_url:
                    logger.info(f"[job {job_id}] Proxy ENABLED for video {video_id}")
                else:
                    logger.warning(f"[job {job_id}] Proxy DISABLED — PROXY_ENABLED={PROXY_ENABLED}")
                audio_path = await asyncio.to_thread(extract_youtube_audio, video_id, proxy_url=proxy_url)
                temp_files.append(audio_path)
            except MembersOnlyVideoError:
                await update_job(status="error", error_message="members_only")
                return
            except Exception as e:
                error_msg = str(e)
                if any(kw in error_msg.lower() for kw in MEMBERS_ONLY_KEYWORDS):
                    await update_job(status="error", error_message="members_only")
                    return
                is_restricted = '152' in error_msg or 'unavailable' in error_msg.lower()
                track_event(user_id, 'whisper_failed', {
                    'video_id': video_id,
                    'source_type': source_type,
                    'error_type': 'youtube_restricted' if is_restricted else 'extraction_error',
                    'error_message': error_msg
                })
                await update_job(status="error", error_message=error_msg)
                return
        else:
            logger.info(f"[job {job_id}] Writing uploaded audio to temp file: {audio_filename}")
            suffix = os.path.splitext(audio_filename or "")[1] or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(audio_content)
                audio_path = tmp.name
                temp_files.append(audio_path)

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
            reason="Whisper AI transcription",
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
        logger.info(f"[job {job_id}] Calling Whisper API for {duration:.2f}s audio ({credit_cost} credits)")
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

        video_url = f"https://www.youtube.com/watch?v={video_id}" if source_type == "youtube" and video_id else None
        transcript_insert = await asyncio.to_thread(
            lambda: supabase.table('transcripts').insert({
                'user_id': user_id,
                'video_id': video_id,
                'title': video_id or 'Untitled',
                'transcript': transcript,
            }).execute()
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
    user_id: str = Form(...),
    source_type: str = Form(...),
    video_id: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Start a Whisper transcription background job.
    Returns immediately with { job_id, status: "pending" }.
    Poll GET /api/jobs/{job_id}?user_id=... for progress and result.
    """
    # Validate request
    if source_type not in ["youtube", "upload"]:
        return JSONResponse(status_code=400, content={"error": "Invalid source_type", "code": "invalid_request"})
    if source_type == "youtube" and not video_id:
        return JSONResponse(status_code=400, content={"error": "video_id required for YouTube transcription", "code": "invalid_request"})
    if source_type == "upload" and not audio_file:
        return JSONResponse(status_code=400, content={"error": "audio_file required for upload transcription", "code": "invalid_request"})

    # Read upload bytes now — UploadFile cannot be read inside a background task
    audio_content: Optional[bytes] = None
    audio_filename: Optional[str] = None
    if source_type == "upload" and audio_file:
        audio_content = await audio_file.read()
        audio_filename = audio_file.filename

    # Basic credit pre-check (balance must be > 0 to start any job)
    try:
        current_balance = await asyncio.to_thread(check_user_balance, user_id)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Could not check credit balance: {str(e)}"})

    if current_balance < 1:
        return JSONResponse(status_code=402, content={
            "error": "Insufficient credits",
            "code": "insufficient_credits",
            "available_credits": current_balance
        })

    # Insert job row into Supabase whisper_jobs
    job_id = str(uuid.uuid4())
    video_url = f"https://www.youtube.com/watch?v={video_id}" if source_type == "youtube" and video_id else None
    supabase = get_supabase_client()
    supabase.table('whisper_jobs').insert({
        'id': job_id,
        'user_id': user_id,
        'status': 'pending',
        'video_url': video_url,
        'source_type': source_type,
    }).execute()

    asyncio.create_task(run_whisper_job(
        job_id=job_id,
        user_id=user_id,
        source_type=source_type,
        video_id=video_id,
        audio_content=audio_content,
        audio_filename=audio_filename,
    ))

    logger.info(f"Whisper job created: {job_id} (user={user_id}, source={source_type}, video={video_id})")
    return JSONResponse({"job_id": job_id, "status": "pending"})


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str, user_id: str):
    """
    Poll a Whisper transcription job.
    Returns job status and, when complete, the full transcript + metadata.
    """
    supabase = get_supabase_client()
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('whisper_jobs').select('*').eq('id', job_id).single().execute()
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
    if job.get('transcript_id'):
        try:
            t_result = await asyncio.to_thread(
                lambda: supabase.table('transcripts').select('transcript').eq('id', job['transcript_id']).single().execute()
            )
            transcript = t_result.data.get('transcript') if t_result.data else None
        except Exception:
            pass

    return JSONResponse({
        "job_id": job_id,
        "status": job['status'],
        "transcript": transcript,
        "duration": job.get('duration_seconds'),
        "credits_used": job.get('credits_cost'),
        "error_message": job.get('error_message'),
        "error_code": None,
        "required_credits": None,
        "available_credits": None,
    })

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_transcript(request: SummarizeRequest):
    """Summarize transcript using DeepSeek V3 chat model."""
    try:
        # 1. Check balance
        try:
            current_balance = check_user_balance(request.user_id)
        except Exception as e:
            return SummarizeResponse(success=False, error=f"Could not check credit balance: {str(e)}")
            
        if current_balance < 1:
            logger.warning(f"Insufficient credits for summary: user {request.user_id} has {current_balance}, needs 1")
            return SummarizeResponse(success=False, error="Insufficient credits")
        
        # 2. Deduct credit atomically
        deduction_result = deduct_credits(
            user_id=request.user_id,
            amount=1,
            reason="AI Summarization",
            metadata={"transcript_id": request.transcript_id}
        )
        if not deduction_result.get('success'):
            logger.error(f"Credit deduction failed: {deduction_result.get('error')}")
            return SummarizeResponse(success=False, error="Credit deduction failed")

        # Track credits_deducted for summary
        track_event(request.user_id, 'credits_deducted', {
            'amount': 1,
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
            add_credits(request.user_id, 1, "AI Summarization Refund (Transcript fetch failed)")
            return SummarizeResponse(success=False, error="Transcript not found")
            
        # Combine transcript text
        full_text = " ".join([item['text'] for item in transcript_data if 'text' in item])
        if not full_text.strip():
            add_credits(request.user_id, 1, "AI Summarization Refund (Empty text)")
            return SummarizeResponse(success=False, error="Transcript is empty")
            
        # 4. Call DeepSeek API
        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if not deepseek_api_key:
            add_credits(request.user_id, 1, "AI Summarization Refund (DeepSeek API key missing)")
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
                add_credits(request.user_id, 1, "AI Summarization Refund (DeepSeek API Error)")
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
            add_credits(request.user_id, 1, f"AI Summarization Refund ({type(e).__name__})")
            return SummarizeResponse(success=False, error="Failed to generate summary")
            
    except Exception as e:
        logger.error(f"Summarize endpoint error: {e}")
        return SummarizeResponse(success=False, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
