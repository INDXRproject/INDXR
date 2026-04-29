"""
YouTube caption extraction utilities.
Shared between main.py (FastAPI API process) and worker.py (ARQ worker process).
"""
import asyncio
import logging
import os
import re
import secrets
import time
from typing import List, Optional

import httpx
import yt_dlp
from lingua import Language, LanguageDetectorBuilder

from audio_utils import MembersOnlyVideoError, MEMBERS_ONLY_KEYWORDS

logger = logging.getLogger("indxr-youtube-utils")

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

_PROXY_HOST = os.getenv("PROXY_HOST", "")
_PROXY_PORT = os.getenv("PROXY_PORT", "")
_PROXY_USERNAME = os.getenv("PROXY_USERNAME", "")
_PROXY_PASSWORD = os.getenv("PROXY_PASSWORD", "")
_PROXY_ENABLED = os.getenv("PROXY_ENABLED", "false").lower() == "true"


def get_proxy_url(session_id: Optional[str] = None) -> Optional[str]:
    """
    Build a sticky-session proxy URL. Returns None when proxy is disabled.
    Pass session_id to pin an extraction to a consistent exit IP.
    """
    if not _PROXY_ENABLED:
        return None
    if not _PROXY_USERNAME or not _PROXY_PASSWORD or not _PROXY_HOST:
        logger.warning("PROXY_ENABLED=true but credentials are missing — running without proxy")
        return None
    sid = session_id or secrets.token_hex(4)
    return f"http://user-{_PROXY_USERNAME}-session-{sid}:{_PROXY_PASSWORD}@{_PROXY_HOST}:{_PROXY_PORT}"


def parse_timestamp(timestamp: str) -> float:
    parts = timestamp.split(':')
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
    elif len(parts) == 2:
        minutes, seconds = parts
        return float(minutes) * 60 + float(seconds)
    return float(parts[0])


def find_longest_overlap(text1: str, text2: str) -> int:
    words1 = text1.split()
    words2 = text2.split()
    for length in range(min(len(words1), len(words2)), 0, -1):
        if words1[-length:] == words2[:length]:
            return length
    return 0


def remove_overlaps(captions: List[dict]) -> List[dict]:
    if not captions:
        return []
    result = [captions[0].copy()]
    for i in range(1, len(captions)):
        prev_caption = result[-1]
        curr_caption = captions[i].copy()
        overlap_words = find_longest_overlap(prev_caption['text'], curr_caption['text'])
        if overlap_words > 0:
            words = curr_caption['text'].split()
            curr_caption['text'] = ' '.join(words[overlap_words:])
        if curr_caption['text'].strip():
            result.append(curr_caption)
    return result


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
                        'duration': max(duration, 0.1),
                    })
            except Exception as e:
                logger.error(f"Error parsing subtitle line: {line} - {e}")
        i += 1

    if not raw_entries:
        return []

    raw_entries.sort(key=lambda x: x['offset'])
    cleaned_entries = remove_overlaps(raw_entries)

    final_transcript = []
    seen_texts = set()
    for i, entry in enumerate(cleaned_entries):
        text = entry['text']
        is_redundant = text in seen_texts
        if not is_redundant:
            look_range = range(max(0, i - 2), min(len(cleaned_entries), i + 3))
            for check_idx in look_range:
                if check_idx == i:
                    continue
                if text != cleaned_entries[check_idx]['text'] and text in cleaned_entries[check_idx]['text']:
                    is_redundant = True
                    break
        if not is_redundant:
            next_offset = cleaned_entries[i + 1]['offset'] if i + 1 < len(cleaned_entries) else None
            calculated_duration = (next_offset - entry['offset']) if next_offset else entry['duration']
            final_transcript.append({
                'text': text,
                'offset': entry['offset'],
                'duration': max(calculated_duration, 0.1),
            })
            seen_texts.add(text)

    return final_transcript


async def extract_via_youtube_transcript_api(
    video_id: str,
    session_id: Optional[str] = None,
) -> Optional[dict]:
    """
    Attempt caption extraction via youtube-transcript-api (cascade step 1).

    Returns dict with 'transcript', 'language', 'model' on success, or None on any
    failure (rate-limit, blocked, no captions, etc.). Never raises — None signals
    the cascade to fall through to the next step.
    """
    logger.info(f"[YT-API] attempting {video_id}")
    try:
        from youtube_transcript_api import (
            YouTubeTranscriptApi,
            IpBlocked,
            NoTranscriptFound,
            RequestBlocked,
            TranscriptsDisabled,
            VideoUnavailable,
            VideoUnplayable,
        )
        from youtube_transcript_api.proxies import GenericProxyConfig

        proxy_url = get_proxy_url(session_id or secrets.token_hex(4))
        proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url) if proxy_url else None

        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        fetched = await asyncio.to_thread(ytt_api.fetch, video_id, languages=["en"])

        transcript = [
            {"text": snippet.text, "offset": snippet.start, "duration": snippet.duration}
            for snippet in fetched
        ]

        logger.info(f"[YT-API] success for {video_id} lang={fetched.language_code}")
        return {
            "transcript": transcript,
            "language": fetched.language_code,
            "model": "youtube_transcript_api",
        }

    except RequestBlocked:
        logger.info(f"[YT-API] {video_id}: RequestBlocked (proxy IP geblokkeerd)")
        return None
    except IpBlocked:
        logger.info(f"[YT-API] {video_id}: IpBlocked")
        return None
    except TranscriptsDisabled:
        logger.info(f"[YT-API] {video_id}: TranscriptsDisabled (geen captions ingeschakeld)")
        return None
    except NoTranscriptFound:
        logger.info(f"[YT-API] {video_id}: NoTranscriptFound (geen Engelse captions)")
        return None
    except VideoUnavailable:
        logger.info(f"[YT-API] {video_id}: VideoUnavailable")
        return None
    except VideoUnplayable:
        logger.info(f"[YT-API] {video_id}: VideoUnplayable")
        return None
    except Exception as e:
        logger.warning(f"[YT-API] {video_id}: unexpected {type(e).__name__}: {e}")
        return None


async def extract_with_ytdlp(
    video_id: str,
    use_proxy: bool = True,
    session_id: Optional[str] = None,
) -> dict:
    """
    Extract English captions from a YouTube video via yt-dlp.

    Returns a dict with 'transcript', 'title', 'channel', etc. on success,
    or an empty dict {} when no captions are available.
    Raises MembersOnlyVideoError or Exception on hard errors.

    Note: contains blocking I/O (yt_dlp, httpx). Declare callers as async
    and call with `await`; the event loop is blocked during the sync portions.
    """
    logger.info(f"[YT-DLP] attempting {video_id}")
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'socket_timeout': 10,
        'retries': 3,
        'enabled_runtimes': ['node'],
        'remote_components': ['ejs:github'],
    }
    if use_proxy:
        proxy_url = get_proxy_url(session_id=session_id)
        if proxy_url:
            ydl_opts['proxy'] = proxy_url
            logger.info("Using proxy for caption extraction")
        else:
            logger.info("Proxy disabled — extracting captions directly")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)

            subtitles = None
            if info.get('subtitles') and 'en' in info['subtitles']:
                subtitles = info['subtitles']['en']
            elif info.get('automatic_captions') and 'en' in info['automatic_captions']:
                subtitles = info['automatic_captions']['en']

            if not subtitles:
                logger.info(f"[YT-DLP] {video_id}: no_captions (no English subtitles)")
                return {}

            vtt_subtitle = next((s for s in subtitles if s.get('ext') == 'vtt'), None)
            if not vtt_subtitle:
                logger.info(f"[YT-DLP] {video_id}: no_captions (no VTT format)")
                return {}

            subtitle_url = vtt_subtitle['url']
            dl_proxy_url = get_proxy_url(session_id=session_id) if use_proxy else None

            subtitle_data = None
            for attempt in range(3):
                try:
                    kwargs: dict = {"timeout": 15.0}
                    if dl_proxy_url:
                        kwargs["proxy"] = dl_proxy_url
                    with httpx.Client(**kwargs) as client:
                        resp = client.get(subtitle_url)
                        resp.raise_for_status()
                        subtitle_data = resp.text
                        break
                except Exception as e:
                    logger.warning(f"[YT-DLP] {video_id}: VTT download attempt {attempt + 1} failed: {e}")
                    if attempt == 2:
                        raise Exception(f"Failed to download subtitles after 3 attempts: {e}")
                    time.sleep(1)

            if not subtitle_data:
                logger.info(f"[YT-DLP] {video_id}: no_captions (VTT download empty)")
                return {}

            transcript = parse_vtt_to_transcript(subtitle_data)

            raw_language = info.get('language')
            language: Optional[str] = None
            language_detected: Optional[bool] = None
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
                except Exception:
                    pass

            raw_date = info.get('upload_date')
            iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}" if raw_date else None

            logger.info(f"[YT-DLP] success for {video_id} lang={language}")
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
        logger.info(f"[YT-DLP] {video_id}: MembersOnly")
        raise
    except Exception as e:
        error_str = str(e).lower()
        if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
            logger.warning(f"[YT-DLP] {video_id}: MembersOnly (keyword detected)")
            raise MembersOnlyVideoError("This video is only available to channel members.")
        logger.error(f"[YT-DLP] {video_id}: {type(e).__name__}: {e}")
        raise
