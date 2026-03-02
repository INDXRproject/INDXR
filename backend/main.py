from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import uuid
import logging
import yt_dlp
import urllib.request
import os
import tempfile
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Whisper modules
from audio_utils import (
    get_audio_duration,
    extract_youtube_audio,
    validate_audio_file,
    compress_audio_if_needed
)
from whisper_client import transcribe_audio
from credit_manager import (
    check_user_balance,
    calculate_credit_cost,
    deduct_credits
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-backend")

app = FastAPI(title="INDXR.AI Backend", version="1.0.0")

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
            
            if use_proxy:
                proxy_url = get_proxy_url()
                if proxy_url:
                    proxy_handler = urllib.request.ProxyHandler({
                        'http': proxy_url,
                        'https': proxy_url
                    })
                    opener = urllib.request.build_opener(proxy_handler)
                    urllib.request.install_opener(opener)
            
            with urllib.request.urlopen(subtitle_url) as response:
                subtitle_data = response.read().decode('utf-8')
            
            transcript = parse_vtt_to_transcript(subtitle_data)
            return {
                'transcript': transcript,
                'title': info.get('title'),
                'video_url': info.get('webpage_url')
            }
            
    except Exception as e:
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
            video_url=result['video_url']
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

@app.post("/api/transcribe/whisper", response_model=WhisperResponse)
async def transcribe_with_whisper(
    user_id: str = Form(...),
    source_type: str = Form(...),
    video_id: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Transcribe audio using OpenAI Whisper API.
    Supports YouTube videos (fallback) and custom audio uploads.
    Credits are only deducted after successful transcription.
    """
    temp_files = []  # Track temp files for cleanup
    
    try:
        # Validate request
        if source_type not in ["youtube", "upload"]:
            raise HTTPException(status_code=400, detail="Invalid source_type. Must be 'youtube' or 'upload'")
        
        if source_type == "youtube" and not video_id:
            raise HTTPException(status_code=400, detail="video_id required for YouTube transcription")
        
        if source_type == "upload" and not audio_file:
            raise HTTPException(status_code=400, detail="audio_file required for upload transcription")
        
        # Step 1: Get audio file
        audio_path = None
        
        if source_type == "youtube":
            logger.info(f"Extracting YouTube audio for video: {video_id}")
            try:
                audio_path = extract_youtube_audio(video_id)
                temp_files.append(audio_path)
            except Exception as e:
                return WhisperResponse(
                    success=False,
                    error=f"Failed to extract audio from YouTube: {str(e)}"
                )
        
        else:  # upload
            logger.info(f"Processing uploaded audio file: {audio_file.filename}")
            
            # Save uploaded file to temp directory
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp:
                content = await audio_file.read()
                tmp.write(content)
                audio_path = tmp.name
                temp_files.append(audio_path)
        
        # Step 2: Validate audio file
        validation = validate_audio_file(audio_path)
        
        if not validation['valid']:
            return WhisperResponse(
                success=False,
                error=validation['error']
            )
        
        # Step 3: Get audio duration
        try:
            duration = get_audio_duration(audio_path)
        except Exception as e:
            return WhisperResponse(
                success=False,
                error=f"Could not determine audio duration: {str(e)}"
            )
        
        # Step 4: Calculate credit cost
        credit_cost = calculate_credit_cost(duration)
        
        # Step 5: Check user balance
        try:
            current_balance = check_user_balance(user_id)
        except Exception as e:
            return WhisperResponse(
                success=False,
                error=f"Could not check credit balance: {str(e)}"
            )
        
        # Step 6: Verify sufficient credits
        if current_balance < credit_cost:
            logger.warning(f"Insufficient credits: user {user_id} has {current_balance}, needs {credit_cost}")
            return WhisperResponse(
                success=False,
                error="Insufficient credits",
                required_credits=credit_cost,
                available_credits=current_balance
            )
        
        # Step 7: Compress audio if needed (>25MB)
        if validation['size_mb'] > 25:
            logger.info(f"Audio file exceeds 25MB, compressing...")
            try:
                compressed_path = compress_audio_if_needed(audio_path)
                if compressed_path != audio_path:
                    temp_files.append(compressed_path)
                    audio_path = compressed_path
            except Exception as e:
                return WhisperResponse(
                    success=False,
                    error=f"Audio file too large and compression failed: {str(e)}"
                )
        
        # Step 8: Call Whisper API
        logger.info(f"Calling Whisper API for {duration:.2f}s audio (cost: {credit_cost} credits)")
        whisper_result = transcribe_audio(audio_path)
        
        if not whisper_result['success']:
            # Whisper API failed - DO NOT deduct credits
            logger.error(f"Whisper API failed: {whisper_result['error']}")
            return WhisperResponse(
                success=False,
                error=whisper_result['error']
            )
        
        # Step 9: Deduct credits (only after successful transcription)
        metadata = {
            'source_type': source_type,
            'duration_seconds': duration,
            'video_id': video_id if source_type == 'youtube' else None,
            'filename': audio_file.filename if source_type == 'upload' else None
        }
        
        deduction_result = deduct_credits(
            user_id=user_id,
            amount=credit_cost,
            reason="Whisper AI transcription",
            metadata=metadata
        )
        
        if not deduction_result.get('success'):
            # This shouldn't happen (we checked balance), but handle it
            logger.error(f"Credit deduction failed after successful transcription: {deduction_result.get('error')}")
            return WhisperResponse(
                success=False,
                error="Transcription succeeded but credit deduction failed. Please contact support."
            )
        
        # Step 10: Return success
        transcript = [
            TranscriptItem(
                text=item['text'],
                offset=item['offset'],
                duration=item['duration']
            )
            for item in whisper_result['transcript']
        ]
        
        logger.info(f"Whisper transcription successful: {len(transcript)} segments, {credit_cost} credits deducted")
        
        return WhisperResponse(
            success=True,
            transcript=transcript,
            duration=duration,
            credits_used=credit_cost
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Whisper endpoint error: {type(e).__name__}: {e}")
        return WhisperResponse(
            success=False,
            error=f"Internal server error: {str(e)}"
        )
    
    finally:
        # Clean up temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.info(f"Cleaned up temp file: {temp_file}")
            except Exception as e:
                logger.warning(f"Failed to clean up temp file {temp_file}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
