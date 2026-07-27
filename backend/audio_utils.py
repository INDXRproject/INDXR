"""
Audio processing utilities for INDXR.AI
Handles audio duration detection, YouTube audio extraction, and file validation
"""

import os
import math
import subprocess
import logging
import time
from typing import Dict, Optional
from pydub import AudioSegment
import yt_dlp

logger = logging.getLogger("indxr-backend")

# Supported audio formats for AssemblyAI compatibility
SUPPORTED_FORMATS = {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}
MAX_FILE_SIZE_MB = 500
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


def get_audio_container(file_path: str, filename_hint: Optional[str] = None) -> str:
    """
    Bepaal het ECHTE containerformaat uit de bestandsINHOUD via ffprobe (magic bytes), niet uit de
    bestandsnaam-extensie. Een .webm die naar .mp3 is hernoemd loog voorheen 'mp3'; dit leest de
    werkelijke container. Retourneert een van: mp3/mp4/wav/m4a/ogg/flac/webm/mkv, anders de ruwe
    format_name-token, of 'unknown' als ffprobe faalt. (Deel 3 audio-telemetrie — Operations.)
    """
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=format_name',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            names = set(result.stdout.strip().lower().split(','))  # bv 'mov,mp4,m4a,3gp,3g2,mj2'
            for fam in ('mp3', 'flac', 'wav', 'ogg', 'webm'):
                if fam in names:
                    return fam
            if 'matroska' in names:
                return 'mkv'
            if names & {'mp4', 'm4a', 'mov'}:
                # mp4-familie (ffprobe kan m4a/mp4 niet los zien) — ext-hint kiest BINNEN de bevestigde
                # familie, dus geen leugen: de inhoud IS mp4/m4a, alleen het subtype uit de naam.
                ext = os.path.splitext(filename_hint or '')[1].lstrip('.').lower()
                return 'm4a' if ext == 'm4a' else 'mp4'
            return sorted(names)[0] if names else 'unknown'
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError) as e:
        logger.warning(f"ffprobe container-detect faalde: {e}")
    return 'unknown'


# ADR-050 — reserve-bedrag voor een audio-UPLOAD, server-side + onomzeilbaar bepaald VÓÓR reserve.
# De duur van een upload is niet bekend op reserve-moment (het bestand wordt pas in de pipeline
# geprobed) en de client-waarde is onbetrouwbaar (directe JWT-upload → volledig client-gecontroleerd).
# Zonder deze probe viel het reserve-bedrag terug op ceil(0/60)→1 credit = een LEGE overspend-gate
# voor uploads (iemand met 1 credit kon een uur-lange upload starten; het meerdere werd gratis werk).
UPLOAD_FALLBACK_BYTES_PER_SEC = 8000  # ~64 kbps, bewust laag → overschat de duur (royaal reserveren; settle+refund corrigeren)


def estimate_upload_reserve_cost(audio_path: str) -> Dict:
    """Bepaal het reserve-bedrag (credits) voor een upload uit de ECHTE duur (ffprobe/pydub).
    Faalt de probe → royale schatting uit de bestandsgrootte. Valt NOOIT stil terug op 1
    (dat zou de overspend-gate leegmaken). Retour: {credits, duration|None, source}.

    'duration' is alleen gezet bij een geslaagde probe; de aanroeper geeft die als known_duration
    door aan de pipeline zodat er niet dubbel geprobed wordt. Bij 'size_fallback' is duration None
    → de pipeline probet zelf → settle blijft op de ECHTE duur (of de job faalt netjes + refund).
    Credit-formule identiek aan calculate_credit_cost (1 credit = 1 minuut, minimaal 1)."""
    try:
        dur = get_audio_duration(audio_path)
    except Exception as e:
        logger.warning(f"[upload reserve] duration probe failed ({e}); falling back to size estimate")
        dur = None
    if dur and dur > 0:
        return {"credits": max(1, math.ceil(dur / 60.0)), "duration": dur, "source": "probe"}
    try:
        size = os.path.getsize(audio_path)
    except OSError:
        size = 0
    est_seconds = size / UPLOAD_FALLBACK_BYTES_PER_SEC
    return {"credits": max(1, math.ceil(est_seconds / 60.0)), "duration": None, "source": "size_fallback"}


def extract_youtube_audio(
    video_id: str,
    output_dir: str = "/tmp",
    proxy_url: Optional[str] = None,
    proxy_urls: Optional[list] = None,
) -> tuple[str, str, Optional[str], int]:
    """
    Extract audio from YouTube video using yt-dlp.

    Args:
        video_id: YouTube video ID
        output_dir: Directory to save audio file
        proxy_url: Optional fixed proxy URL for all attempts (backward-compat)
        proxy_urls: Optional list of proxy URLs, one per attempt. When provided,
                    each retry uses a fresh Decodo session-ID (different exit IP),
                    which is required when the previous residential IP went offline
                    mid-download. Takes precedence over proxy_url per attempt.

    Returns:
        Tuple of (audio_path, video_title, channel, raw_bytes) where raw_bytes is the
        pre-ffmpeg downloaded size in bytes = the true Decodo proxy egress (persisted as
        transcription_jobs.proxy_bytes for cost accounting).

    Raises:
        MembersOnlyVideoError: If video is members-only
        Exception: If download fails after all attempts
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
    # player_client: ios bypasses YouTube PO token requirements and works
    # reliably with HTTP proxies. web_embedded is the fallback. See ADR-027.
    #
    # retries=3 (not the default 10): on a dead residential proxy, 10 internal
    # retries waste ~5 minutes before our outer retry fires with a fresh exit IP.
    # 3 is sufficient for transient single-packet loss. See ADR-031.
    base_ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f"{base_output_path}.%(ext)s",
        'quiet': True,
        'no_warnings': True,
        'verbose': False,
        'socket_timeout': 120,
        'retries': 3,
        'extractor_retries': 3,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'web_embedded'],
            },
        },
    }

    max_attempts = 3
    last_error = None
    video_title = video_id
    channel = None
    # BLOK C: sommeer de Decodo-egress van ÁLLE pogingen (niet enkel de geslaagde). Een mislukte
    # 1e/2e poging heeft al bytes over de proxy getrokken (partial download) — die kosten waren echt.
    cumulative_bytes = 0

    def _measure_partial_egress() -> int:
        """Som de bytes van de (partial) downloadbestanden van de zojuist mislukte poging.
        De cleanup aan het begin van de VOLGENDE poging verwijdert ze, dus meet nu."""
        total = 0
        for partial in glob.glob(f"{base_output_path}.*"):
            if partial.endswith('.ogg'):
                continue
            try:
                total += os.path.getsize(partial)
            except OSError:
                pass
        return total

    for attempt in range(1, max_attempts + 1):
        # Rotate proxy session on each attempt: proxy_urls[attempt-1] takes
        # precedence; fall back to the fixed proxy_url for backward-compat.
        if proxy_urls and len(proxy_urls) >= attempt:
            attempt_proxy = proxy_urls[attempt - 1]
        else:
            attempt_proxy = proxy_url

        ydl_opts = dict(base_ydl_opts)
        if attempt_proxy:
            ydl_opts['proxy'] = attempt_proxy
            masked = attempt_proxy.split('@')[-1] if '@' in attempt_proxy else attempt_proxy
        else:
            masked = 'none'

        logger.info(f"[YT-DLP-AUDIO attempt={attempt}/{max_attempts} video={video_id} proxy=@{masked}]")

        try:
            # Clean up any partial files from a previous attempt so yt-dlp
            # starts fresh (no continuedl resume with a dead IP).
            for stale in glob.glob(f"{base_output_path}.*"):
                if not stale.endswith('.ogg'):
                    try:
                        os.remove(stale)
                    except OSError:
                        pass

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
                video_title = info.get('title') or video_id if info else video_id
                channel = (info.get('uploader') or info.get('channel')) if info else None

            # Find the downloaded file (could be .webm, .m4a, .opus, etc.)
            raw_files = [f for f in glob.glob(f"{base_output_path}.*") if not f.endswith('.ogg')]
            if not raw_files:
                raise Exception("yt-dlp did not produce any audio file")

            raw_path = raw_files[0]
            raw_size_bytes = os.path.getsize(raw_path)  # pre-ffmpeg = true Decodo egress (persisted per job)
            cumulative_bytes += raw_size_bytes  # BLOK C: tel deze (geslaagde) download bij de eerdere pogingen op
            raw_size = raw_size_bytes / 1024 / 1024
            logger.info(f"[YT-DLP-AUDIO] downloaded: {raw_path} ({raw_size:.2f}MB)")

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

            os.remove(raw_path)

            final_size = os.path.getsize(final_output_path) / 1024 / 1024
            logger.info(f"[YT-DLP-AUDIO] conversion done: {raw_size:.2f}MB → {final_size:.2f}MB ogg")

            return final_output_path, video_title, channel, cumulative_bytes

        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            # BLOK C: reken de egress van DEZE mislukte poging mee (partial download op disk).
            cumulative_bytes += _measure_partial_egress()

            if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
                logger.warning(f"[YT-DLP-AUDIO] members-only detected: {video_id}")
                raise MembersOnlyVideoError("This video is only available to channel members and cannot be transcribed.")

            # Classify the failure reason to decide whether to retry
            is_partial_write = any(kw in error_str for kw in (
                'bytes read', 'more expected', 'incomplete read', 'content-length',
            ))
            is_timeout = any(kw in error_str for kw in (
                'timed out', 'timeout', 'read timeout', 'connectionpool',
            ))
            is_connection = any(kw in error_str for kw in (
                'ssl', 'unexpected_eof', 'eof', 'connectionreset',
                'remotedisconnected', 'broken pipe', 'connection reset',
            ))

            if (is_partial_write or is_timeout or is_connection) and attempt < max_attempts:
                delay = 2 ** attempt  # 2s, 4s
                reason = 'partial_write' if is_partial_write else ('timeout' if is_timeout else 'connection')
                logger.warning(
                    f"[YT-DLP-AUDIO retry={attempt}/{max_attempts} reason={reason} video={video_id}] "
                    f"retrying in {delay}s with fresh proxy session"
                )
                time.sleep(delay)
            else:
                break

    logger.error(f"[YT-DLP-AUDIO final_fail attempts={attempt} video={video_id} egress={cumulative_bytes}B] {last_error}")
    # BLOK B+C: geef de gesommeerde egress mee op de exception zodat de pipeline 'm alsnog op de
    # (mislukte) job kan persisteren — de proxy-kost was echt, ook al faalde de download.
    final_err = Exception(f"Failed to extract audio from YouTube: {str(last_error)}")
    final_err.proxy_bytes = cumulative_bytes
    raise final_err



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
            raise Exception(f"Compressed file still exceeds {MAX_FILE_SIZE_MB}MB limit")

        return output_path

    except Exception as e:
        logger.error(f"Audio compression failed: {e}")
        raise Exception(f"Failed to compress audio: {str(e)}")
