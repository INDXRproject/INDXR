"""
YouTube caption extraction utilities.
Shared between main.py (FastAPI API process) and worker.py (ARQ worker process).
"""
import asyncio
import logging
import os
import random
import re
import secrets
import time
from typing import List, Optional

import httpx
import sentry_sdk
import yt_dlp
from lingua import Language, LanguageDetectorBuilder

from audio_utils import MembersOnlyVideoError, MEMBERS_ONLY_KEYWORDS
from language_utils import normalize_language_code

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


def _base_lang(code: Optional[str]) -> Optional[str]:
    """Base language code, region- and marker-stripped: 'en-GB'->'en', 'pt-BR'->'pt', 'ja'->'ja'.
    Used to match a track against the native/audio language regardless of regional variant."""
    return code.split('-')[0].lower() if code else None


async def extract_via_youtube_transcript_api(
    video_id: str,
    session_id: Optional[str] = None,
    lang_pref: Optional[str] = None,
) -> Optional[dict]:
    """
    Attempt caption extraction via youtube-transcript-api (cascade step 1).

    lang_pref: preferred language (from YouTube Data API video.language). If set and
    not 'en', tries [lang_pref, 'en'] so the original-language track is returned
    before any machine-translated English variant. Falls back to ['en'] otherwise.

    Returns dict with 'transcript', 'language', 'model' on success, or None on any
    failure (rate-limit, blocked, no captions, etc.). Never raises — None signals
    the cascade to fall through to the next step.
    """
    # lang_pref is IGNORED for track selection (unreliable). We anchor on the native/audio
    # language via the ASR (generated) track and never translate — see below.
    logger.info(f"[YT-API] attempting {video_id} (native-anchored; lang_pref={lang_pref!r} not used for steering)")
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

        # List base transcripts (translations are on-demand via .translate(), NOT listed here, so
        # nothing we iterate is a machine translation). The GENERATED (ASR) transcript's language
        # is the video's native/audio language. Prefer a MANUAL transcript in that native language
        # (human native), else the native ASR. If there is NO ASR track we cannot determine native
        # reliably here → return None so the yt-dlp cascade (which has info['language']) decides.
        transcript_list = await asyncio.to_thread(ytt_api.list, video_id)
        generated = [t for t in transcript_list if t.is_generated]
        if not generated:
            logger.info(f"[YT-API] {video_id}: no ASR track to anchor native language → defer to yt-dlp cascade")
            return None
        native = generated[0].language_code
        native_base = _base_lang(native)
        chosen = next(
            (t for t in transcript_list if not t.is_generated and _base_lang(t.language_code) == native_base),
            None,
        ) or generated[0]
        fetched = await asyncio.to_thread(chosen.fetch)

        transcript = [
            {"text": snippet.text, "offset": snippet.start, "duration": snippet.duration}
            for snippet in fetched
        ]

        logger.info(f"[YT-API] success for {video_id} native={native!r} lang={fetched.language_code} generated={chosen.is_generated}")
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
        logger.info(f"[YT-API] {video_id}: NoTranscriptFound (geen captions voor {languages})")
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
    clients: list | None = None,
    lang_pref: Optional[str] = None,
) -> dict:
    """
    Extract captions from a YouTube video via yt-dlp.

    lang_pref: hint from YouTube Data API (unreliable — may return 'en' for non-English
    videos). Used only to prefer a specific -orig key; does NOT gate which tracks are
    requested. yt-dlp always fetches all -orig (native ASR) tracks so we never download
    a tlang= machine-translation URL, regardless of what lang_pref says.

    Returns a dict with 'transcript', 'title', 'channel', etc. on success,
    or an empty dict {} when no captions are available.
    Raises MembersOnlyVideoError or Exception on hard errors.

    clients: yt-dlp player_client list. Default ['ios', 'web_embedded'] (stap 2).
             Pass ['tv', 'android'] for stap 3 client-rotatie.

    Note: contains blocking I/O (yt_dlp, httpx). Declare callers as async
    and call with `await`; the event loop is blocked during the sync portions.
    """
    _clients = clients or ['ios', 'web_embedded']
    # lang_pref (YouTube Data API) is NOT used to steer track selection — it is unreliable
    # (returns 'en' for non-English videos). The native/audio language is anchored on yt-dlp's
    # own info['language'] + the '-orig' ASR marker below. Kept only for diagnostics.
    log_prefix = "[YT-DLP]" if _clients == ['ios', 'web_embedded'] else "[YT-DLP-ROT]"
    logger.info(f"{log_prefix} attempting {video_id} lang_pref={lang_pref!r}")
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['.*-orig', 'en'],  # native ASR (any lang) + en fallback; .*-orig never has tlang=
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'socket_timeout': 10,
        'retries': 3,
        'enabled_runtimes': ['node'],
        'remote_components': ['ejs:github'],
        'player_client': _clients,
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
            selected_lang = None
            manual_subs = info.get('subtitles') or {}
            auto_captions = info.get('automatic_captions') or {}
            orig_keys = [k for k in auto_captions if k.endswith('-orig')]

            # ── Native-anchored selection (ADR: always the ORIGINAL track, never a translation) ──
            # Determine the video's native/audio language, then pick ONLY a track in that language.
            # Manual subtitles are NOT inherently native — a video can carry human translations in
            # many languages (e.g. Napoleon Bm1RhjcdJek has 26 manual tracks incl. Albanian). The
            # old code picked manual_subs.keys()[0] when 'en' wasn't a literal key (the English track
            # was 'en-GB'), returning Albanian. We anchor instead on two reliable native signals:
            #   1. info['language'] — yt-dlp's detected audio language (e.g. 'en-GB', 'ar', 'ja')
            #   2. the '-orig' key — YouTube's structural native-ASR marker (never has tlang=)
            native_base = _base_lang(info.get('language'))
            if not native_base and orig_keys:
                native_base = _base_lang(orig_keys[0][:-len('-orig')])

            # Priority 1: MANUAL subtitle in the native language (human native, best quality, no tlang=)
            if native_base:
                for k in manual_subs:
                    if _base_lang(k) == native_base:
                        subtitles = manual_subs[k]
                        selected_lang = k
                        logger.info(f"{log_prefix} {video_id}: native manual subtitle lang={k!r} (native={native_base!r})")
                        break

            # Priority 2: native ASR (-orig) — guaranteed native, never tlang=. Only an -orig that
            # matches the native language (or, if native is unknown, the -orig marker itself).
            if not subtitles and orig_keys:
                if native_base:
                    chosen_key = next((k for k in orig_keys if _base_lang(k[:-len('-orig')]) == native_base), None)
                else:
                    chosen_key = orig_keys[0]
                if chosen_key:
                    subtitles = auto_captions[chosen_key]
                    selected_lang = chosen_key
                    logger.info(f"{log_prefix} {video_id}: native ASR lang={chosen_key!r} (orig_keys={orig_keys})")

            # Priority 3: non-orig auto-caption in the native language, only if the URL has no tlang=
            if not subtitles and native_base:
                for k in auto_captions:
                    if k.endswith('-orig') or _base_lang(k) != native_base:
                        continue
                    vtt = next((s for s in auto_captions[k] if s.get('ext') == 'vtt'), None)
                    if vtt and 'tlang=' not in vtt.get('url', ''):
                        subtitles = auto_captions[k]
                        selected_lang = k
                        logger.info(f"{log_prefix} {video_id}: native auto-caption lang={k!r} (no tlang=)")
                        break

            if not subtitles:
                logger.info(f"{log_prefix} {video_id}: no_captions (no NATIVE track; native={native_base!r} video_lang={info.get('language')!r})")
                return {}

            vtt_subtitle = next((s for s in subtitles if s.get('ext') == 'vtt'), None)
            if not vtt_subtitle:
                logger.info(f"{log_prefix} {video_id}: no_captions (no VTT in {selected_lang!r} track)")
                return {}

            subtitle_url = vtt_subtitle['url']
            # Safety net: never download a machine-translated URL (tlang= = YouTube server-side translation)
            if 'tlang=' in subtitle_url:
                logger.warning(f"{log_prefix} {video_id}: rejected tlang= URL for {selected_lang!r}, returning no_captions")
                return {}
            subtitle_data = None
            caption_bytes = 0  # Decodo egress of the VTT download (aggregated per day, free-caption route)
            for attempt in range(3):
                # Rotate the proxy exit IP per attempt: a residential IP that YouTube
                # rate-limited (429) on the timedtext endpoint keeps returning 429, so
                # retrying on the SAME IP is futile. Mirror the audio path's -r{i}
                # session rotation (see ADR-031). Without a pinned session_id,
                # get_proxy_url() generates a fresh random sid, so rotation is automatic.
                if use_proxy:
                    rot_session = f"{session_id}-r{attempt}" if session_id else None
                    attempt_proxy = get_proxy_url(session_id=rot_session)
                else:
                    attempt_proxy = None
                try:
                    kwargs: dict = {"timeout": 15.0}
                    if attempt_proxy:
                        kwargs["proxy"] = attempt_proxy
                    with httpx.Client(**kwargs) as client:
                        resp = client.get(subtitle_url)
                        resp.raise_for_status()
                        subtitle_data = resp.text
                        caption_bytes = len(resp.content)
                        break
                except Exception as e:
                    logger.warning(f"{log_prefix} {video_id}: VTT download attempt {attempt + 1} failed: {e}")
                    if attempt == 2:
                        raise Exception(f"Failed to download subtitles after 3 attempts: {e}")
                    # Async exponential backoff + jitter (was a fixed blocking time.sleep(1)).
                    await asyncio.sleep(2 ** attempt + random.uniform(0, 0.5))

            if not subtitle_data:
                logger.info(f"{log_prefix} {video_id}: no_captions (VTT download empty)")
                return {}

            transcript = parse_vtt_to_transcript(subtitle_data)

            raw_language = info.get('language')
            language: Optional[str] = None
            language_detected: Optional[bool] = None
            if raw_language:
                language = normalize_language_code(raw_language)
                language_detected = False
            else:
                sample = ' '.join(item['text'] for item in transcript[:80])
                sample = ' '.join(sample.split()[:500])
                try:
                    detected = _lingua_detector.detect_language_of(sample)
                    if detected:
                        language = normalize_language_code(detected.iso_code_639_1.name.lower())
                        language_detected = True
                except Exception:
                    pass

            raw_date = info.get('upload_date')
            iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}" if raw_date else None

            logger.info(f"{log_prefix} success for {video_id} lang={language}")
            return {
                'transcript': transcript,
                'title': info.get('title'),
                'video_url': info.get('webpage_url'),
                'duration': info.get('duration'),
                'channel': info.get('uploader'),
                'language': language,
                'language_detected': language_detected,
                'upload_date': iso_date,
                'proxy_bytes': caption_bytes,
            }

    except MembersOnlyVideoError:
        logger.info(f"{log_prefix} {video_id}: MembersOnly")
        raise
    except Exception as e:
        error_str = str(e).lower()
        if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
            logger.warning(f"{log_prefix} {video_id}: MembersOnly (keyword detected)")
            raise MembersOnlyVideoError("This video is only available to channel members.")
        logger.error(f"{log_prefix} {video_id}: {type(e).__name__}: {e}")
        # Breadcrumb zodat de caller's Sentry event ziet welke cascade-stap faalde.
        # Geen capture_exception hier — de caller vangt de re-raise en capturet daar.
        sentry_sdk.add_breadcrumb(
            category="yt-dlp",
            message=f"extract_with_ytdlp failed for {video_id}: {type(e).__name__}: {e}",
            data={"video_id": video_id},
            level="error",
        )
        raise
