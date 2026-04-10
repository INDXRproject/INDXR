"""
Audio processing utilities for INDXR.AI
Handles audio duration detection, YouTube audio extraction, and file validation
"""

import os
import subprocess
import logging
import time
from typing import Dict, Optional
from pydub import AudioSegment
import yt_dlp

logger = logging.getLogger("indxr-backend")

# Supported audio formats for Whisper API
SUPPORTED_FORMATS = {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}
MAX_FILE_SIZE_MB = 25
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

MEMBERS_ONLY_KEYWORDS = [
    'join this channel to get access to members-only content',
    'this video is available to this channel\'s members',
    'unplayable',
    'members-only',
]


class MembersOnlyVideoError(Exception):
    """Raised when a YouTube video is members-only and cannot be accessed."""
    pass


def get_audio_duration(file_path: str) -> float:
    """
    Get audio duration in seconds using ffprobe (fast) with pydub fallback.
    
    Args:
        file_path: Path to audio file
        
    Returns:
        Duration in seconds
        
    Raises:
        Exception: If duration cannot be determined
    """
    # Try ffprobe first (fastest, most accurate)
    try:
        result = subprocess.run(
            [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                file_path
            ],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout.strip():
            duration = float(result.stdout.strip())
            logger.info(f"Audio duration (ffprobe): {duration:.2f}s")
            return duration
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError) as e:
        logger.warning(f"ffprobe failed: {e}, falling back to pydub")
    
    # Fallback to pydub
    try:
        audio = AudioSegment.from_file(file_path)
        duration = len(audio) / 1000.0  # pydub returns milliseconds
        logger.info(f"Audio duration (pydub): {duration:.2f}s")
        return duration
    except Exception as e:
        raise Exception(f"Could not determine audio duration: {str(e)}")


def extract_youtube_audio(video_id: str, output_dir: str = "/tmp", proxy_url: Optional[str] = None) -> tuple[str, str]:
    """
    Extract audio from YouTube video using yt-dlp.

    Args:
        video_id: YouTube video ID
        output_dir: Directory to save audio file
        proxy_url: Optional proxy URL (e.g. http://user:pass@host:port)

    Returns:
        Tuple of (audio_path, video_title)

    Raises:
        Exception: If download fails
    """
    import glob
    base_output_path = os.path.join(output_dir, f"yt_audio_{video_id}")
    final_output_path = f"{base_output_path}.ogg"

    # NOTE: ydl_opts deliberately has NO postprocessors.
    # Adding FFmpegExtractAudio widens yt-dlp's format selection to include
    # DASH video+audio pairs, which triggers a second CDN download that does
    # NOT go through the proxy — causing 403. We mirror the exact CLI command
    # that works and run ffmpeg separately after the download.
    #
    # extractor_args forces the iOS player client (m4a formats).
    # Reason: YouTube's GVS PO Token experiment (active on many videos) requires
    # a JS runtime (node/deno/bun) to compute a Player Orchestration token.
    # Without one, the default Android client formats get a 403 at CDN level.
    # The iOS client bypasses PO token requirements entirely and works reliably
    # with HTTP proxies without strict IP-bound CDN validation.
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f"{base_output_path}.%(ext)s",
        'quiet': True,
        'no_warnings': False,
        'verbose': False,
        'socket_timeout': 120,
        'extractor_args': {
            'youtube': {
                'player_client': ['mweb', 'web_embedded'],
            },
            'youtubepot-bgutilscript': {
                'server_home': ['/root/bgutil-ytdlp-pot-provider/server'],
            }
        },
        'enabled_runtimes': ['node', 'deno'],  # Enable node.js/deno for n challenge solving
        'remote_components': ['ejs:github'],  # Download challenge solver script
        'js_runtimes': {'node': {'path': '/usr/bin/node'}},  # Force Node.js — Deno breaks https-proxy-agent in bgutil
    }

    if proxy_url:
        ydl_opts['proxy'] = proxy_url
        masked = proxy_url.split('@')[-1] if '@' in proxy_url else proxy_url
        logger.info(f"YouTube audio download: using proxy @{masked}")
    else:
        logger.warning("YouTube audio download: NO proxy configured — this may cause 403 errors from YouTube")

    logger.info(f"Starting yt-dlp audio download for video_id={video_id}")
    logger.info(f"YT-DLP OPTIONS: {str(ydl_opts)}")

    max_attempts = 3
    last_error = None
    video_title = video_id  # fallback in case info is unavailable
    for attempt in range(1, max_attempts + 1):
        try:
            # Clean up any partial files from a previous attempt
            for stale in glob.glob(f"{base_output_path}.*"):
                if not stale.endswith('.ogg'):
                    os.remove(stale)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
                video_title = info.get('title') or video_id if info else video_id

            # Find the downloaded file (could be .webm, .m4a, .opus, etc.)
            raw_files = [f for f in glob.glob(f"{base_output_path}.*") if not f.endswith('.ogg')]
            if not raw_files:
                raise Exception("yt-dlp did not produce any audio file")

            raw_path = raw_files[0]
            raw_size = os.path.getsize(raw_path) / 1024 / 1024
            logger.info(f"yt-dlp downloaded: {raw_path} ({raw_size:.2f}MB)")

            # Convert to mono Opus/OGG using ffmpeg (12kbps handles up to ~5 hours within 25MB)
            ffmpeg_cmd = [
                'ffmpeg', '-i', str(raw_path),
                '-vn',                    # no video
                '-map_metadata', '-1',    # strip metadata
                '-ac', '1',               # mono
                '-c:a', 'libopus',        # Opus codec
                '-b:a', '12k',            # 12kbps — handles up to ~5 hours within 25MB
                '-application', 'voip',   # optimized for speech
                str(final_output_path)
            ]
            logger.info(f"Running ffmpeg: {' '.join(ffmpeg_cmd)}")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                raise Exception(f"ffmpeg failed: {result.stderr[-500:]}")

            os.remove(raw_path)  # Clean up raw download

            final_size = os.path.getsize(final_output_path) / 1024 / 1024
            logger.info(f"Audio conversion done: {raw_size:.2f}MB -> {final_size:.2f}MB ogg")

            return final_output_path, video_title

        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
                logger.warning(f"Members-only video detected during audio extraction: {video_id}")
                raise MembersOnlyVideoError("This video is only available to channel members and cannot be transcribed.")
            is_timeout = any(kw in error_str for kw in ('timed out', 'timeout', 'read timeout', 'connectionpool'))
            is_ssl_error = any(kw in error_str for kw in ('ssl', 'unexpected_eof', 'eof', 'connectionreset', 'remotedisconnected'))
            if (is_timeout or is_ssl_error) and attempt < max_attempts:
                delay = 2 ** attempt  # 2s, 4s, 8s
                reason = "SSL/connection error" if is_ssl_error else "timeout"
                logger.warning(f"yt-dlp download {reason} (attempt {attempt}/{max_attempts}), retrying in {delay}s...")
                time.sleep(delay)
            else:
                break

    logger.error(f"YouTube audio extraction failed after {attempt} attempt(s): {last_error}")
    raise Exception(f"Failed to extract audio from YouTube: {str(last_error)}")



def validate_audio_file(file_path: str) -> Dict[str, any]:
    """
    Validate audio file for Whisper API compatibility.
    
    Args:
        file_path: Path to audio file
        
    Returns:
        Dict with keys: valid (bool), error (str), size_mb (float), format (str)
    """
    result = {
        'valid': False,
        'error': None,
        'size_mb': 0.0,
        'format': None
    }
    
    # Check file exists
    if not os.path.exists(file_path):
        result['error'] = "File does not exist"
        return result
    
    # Check file size
    file_size = os.path.getsize(file_path)
    result['size_mb'] = file_size / 1024 / 1024
    
    if file_size > MAX_FILE_SIZE_BYTES:
        result['error'] = f"File too large ({result['size_mb']:.2f}MB). Maximum is {MAX_FILE_SIZE_MB}MB"
        return result
    
    # Check file format
    _, ext = os.path.splitext(file_path.lower())
    result['format'] = ext
    
    if ext not in SUPPORTED_FORMATS:
        result['error'] = f"Unsupported format '{ext}'. Supported: {', '.join(SUPPORTED_FORMATS)}"
        return result
    
    result['valid'] = True
    logger.info(f"Audio file validated: {file_path} ({result['size_mb']:.2f}MB, {ext})")
    return result


def compress_audio_if_needed(file_path: str, output_dir: str = "/tmp") -> str:
    """
    Compress audio to 64kbps mono if file exceeds 25MB limit.
    
    Args:
        file_path: Path to audio file
        output_dir: Directory for compressed file
        
    Returns:
        Path to compressed file (or original if compression not needed)
        
    Raises:
        Exception: If compression fails
    """
    file_size = os.path.getsize(file_path)
    
    if file_size <= MAX_FILE_SIZE_BYTES:
        logger.info("Audio file within size limit, no compression needed")
        return file_path
    
    try:
        logger.info(f"Compressing audio from {file_size / 1024 / 1024:.2f}MB...")

        base_name = os.path.splitext(os.path.basename(file_path))[0]
        output_path = os.path.join(output_dir, f"{base_name}_compressed.ogg")

        ffmpeg_cmd = [
            'ffmpeg', '-i', str(file_path),
            '-vn',                    # no video
            '-map_metadata', '-1',    # strip metadata
            '-ac', '1',               # mono
            '-c:a', 'libopus',        # Opus codec
            '-b:a', '12k',            # 12kbps — handles up to ~5 hours within 25MB
            '-application', 'voip',   # optimized for speech
            str(output_path)
        ]
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise Exception(f"ffmpeg failed: {result.stderr[-500:]}")

        compressed_size = os.path.getsize(output_path)
        logger.info(f"Audio compressed: {compressed_size / 1024 / 1024:.2f}MB")

        if compressed_size > MAX_FILE_SIZE_BYTES:
            raise Exception("Compressed file still exceeds 25MB limit")

        return output_path

    except Exception as e:
        logger.error(f"Audio compression failed: {e}")
        raise Exception(f"Failed to compress audio: {str(e)}")
