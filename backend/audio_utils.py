"""
Audio processing utilities for INDXR.AI
Handles audio duration detection, YouTube audio extraction, and file validation
"""

import os
import subprocess
import logging
from typing import Dict, Optional
from pydub import AudioSegment
import yt_dlp

logger = logging.getLogger("indxr-backend")

# Supported audio formats for Whisper API
SUPPORTED_FORMATS = {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}
MAX_FILE_SIZE_MB = 25
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


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


def extract_youtube_audio(video_id: str, output_dir: str = "/tmp") -> str:
    """
    Extract audio from YouTube video using yt-dlp.
    
    Args:
        video_id: YouTube video ID
        output_dir: Directory to save audio file
        
    Returns:
        Path to downloaded audio file
        
    Raises:
        Exception: If download fails
    """
    output_path = os.path.join(output_dir, f"yt_audio_{video_id}.m4a")
    
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio',
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
        
        if not os.path.exists(output_path):
            raise Exception("Audio file was not created")
        
        logger.info(f"YouTube audio extracted: {output_path} ({os.path.getsize(output_path) / 1024 / 1024:.2f}MB)")
        return output_path
        
    except Exception as e:
        logger.error(f"YouTube audio extraction failed: {e}")
        raise Exception(f"Failed to extract audio from YouTube: {str(e)}")


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
        
        audio = AudioSegment.from_file(file_path)
        
        # Convert to mono and reduce bitrate
        audio = audio.set_channels(1)
        
        # Generate output path
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        output_path = os.path.join(output_dir, f"{base_name}_compressed.mp3")
        
        # Export with low bitrate
        audio.export(
            output_path,
            format="mp3",
            bitrate="64k",
            parameters=["-ar", "16000"]  # 16kHz sample rate (good for speech)
        )
        
        compressed_size = os.path.getsize(output_path)
        logger.info(f"Audio compressed: {compressed_size / 1024 / 1024:.2f}MB")
        
        if compressed_size > MAX_FILE_SIZE_BYTES:
            raise Exception("Compressed file still exceeds 25MB limit")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Audio compression failed: {e}")
        raise Exception(f"Failed to compress audio: {str(e)}")
