"""
ARQ worker — INDXR.AI

Aparte Railway service naast de FastAPI API-service.
Start: python -m arq worker.WorkerSettings

Fase 2: run_whisper_job (YouTube-only).
Upload-pad blijft op asyncio.create_task in main.py — bytes zijn niet queue-serializable.
Fase 3 voegt run_playlist_job toe.
"""

import asyncio
import logging
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Optional, Dict

import posthog
import sentry_sdk
from arq.connections import RedisSettings
from dotenv import load_dotenv
from lingua import Language, LanguageDetectorBuilder

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
    get_supabase_client,
)

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-worker")
logger.setLevel(logging.INFO)

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
)

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = "https://app.posthog.com"

PROXY_HOST = os.getenv("PROXY_HOST", "")
PROXY_PORT = os.getenv("PROXY_PORT", "")
PROXY_USERNAME = os.getenv("PROXY_USERNAME", "")
PROXY_PASSWORD = os.getenv("PROXY_PASSWORD", "")
PROXY_ENABLED = os.getenv("PROXY_ENABLED", "false").lower() == "true"

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


def _track_event(distinct_id: str, event: str, properties: Optional[Dict] = None) -> None:
    if not posthog.api_key:
        return
    try:
        posthog.capture(distinct_id=distinct_id, event=event, properties=properties or {})
    except Exception as e:
        logger.warning(f"PostHog tracking failed: {e}")


def _get_proxy_url(session_id: Optional[str] = None) -> Optional[str]:
    if not PROXY_ENABLED:
        return None
    if not PROXY_USERNAME or not PROXY_PASSWORD or not PROXY_HOST:
        logger.warning("PROXY_ENABLED=true but proxy credentials missing — running without proxy")
        return None
    sid = session_id or secrets.token_hex(4)
    return f"http://user-{PROXY_USERNAME}-session-{sid}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}"


async def run_whisper_job(
    ctx: dict,
    job_id: str,
    user_id: str,
    video_id: str,
    title: Optional[str] = None,
) -> None:
    """
    ARQ task: YouTube Whisper transcription pipeline.

    YouTube-only — upload path stays on asyncio.create_task in main.py (bytes not queue-serializable).

    ack_late=False (WorkerSettings default): if the worker dies mid-flight, the job is not
    retried automatically — same behaviour as the previous asyncio.create_task. The Supabase
    row stays at its last status (downloading/transcribing). Upgrade to ack_late=True in Fase 4
    once idempotency keys prevent double credit deduction on retry.
    """
    supabase = get_supabase_client()
    job_started_at = datetime.now(timezone.utc)
    temp_files: list = []
    credit_cost = 0
    credits_deducted = False

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
        await update_job(status="downloading", started_at=job_started_at.isoformat())
        logger.info(f"[job {job_id}] Downloading YouTube audio for video: {video_id}")

        try:
            proxy_url = _get_proxy_url(session_id=job_id[:8])
            if proxy_url:
                logger.info(f"[job {job_id}] Proxy ENABLED for video {video_id}")
            else:
                logger.warning(f"[job {job_id}] Proxy DISABLED — PROXY_ENABLED={PROXY_ENABLED}")
            audio_path, video_title, channel = await asyncio.to_thread(
                extract_youtube_audio, video_id, proxy_url=proxy_url
            )
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
            _track_event(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube',
                'error_type': error_type, 'error_message': error_msg,
            })
            await update_job(status="error", error_message=error_msg, error_type=error_type)
            return

        # Step 2: Validate
        validation = await asyncio.to_thread(validate_audio_file, audio_path)
        if not validation['valid']:
            await update_job(status="error", error_message=validation['error'])
            return

        # Step 3: Duration
        try:
            duration = await asyncio.to_thread(get_audio_duration, audio_path)
        except Exception as e:
            await update_job(status="error", error_message=f"Could not determine audio duration: {str(e)}")
            return

        # Step 4: Credit check + deduction
        credit_cost = calculate_credit_cost(duration)
        try:
            current_balance = await asyncio.to_thread(check_user_balance, user_id)
        except Exception as e:
            await update_job(status="error", error_message=f"Could not check credit balance: {str(e)}")
            return

        if current_balance < credit_cost:
            logger.warning(f"[job {job_id}] Insufficient credits: has {current_balance}, needs {credit_cost}")
            await update_job(status="error", error_message="Insufficient credits")
            return

        deduction_result = await asyncio.to_thread(
            deduct_credits,
            user_id=user_id,
            amount=credit_cost,
            reason="AssemblyAI transcription",
            metadata={'source_type': 'youtube', 'duration_seconds': duration, 'video_id': video_id, 'job_id': job_id},
        )
        if not deduction_result.get('success'):
            logger.error(f"[job {job_id}] Credit deduction failed: {deduction_result.get('error')}")
            await update_job(status="error", error_message="Credit deduction failed")
            return
        credits_deducted = True
        _track_event(user_id, 'credits_deducted', {
            'amount': credit_cost, 'reason': 'whisper',
            'balance_after': deduction_result.get('new_balance'),
        })

        # Step 5: Compress if >25MB
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

        # Step 6: Transcribe
        await update_job(status="transcribing", started_at=job_started_at.isoformat())
        logger.info(f"[job {job_id}] Calling AssemblyAI for {duration:.2f}s audio ({credit_cost} credits)")
        whisper_start_time = time.time()
        _track_event(user_id, 'whisper_started', {
            'video_id': video_id, 'source_type': 'youtube', 'duration_seconds': duration,
        })

        whisper_result = await asyncio.to_thread(transcribe_with_assemblyai, str(audio_path))

        if not whisper_result['success']:
            logger.error(f"[job {job_id}] AssemblyAI failed: {whisper_result['error']}")
            _track_event(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube',
                'error_type': 'api_error', 'error_message': whisper_result['error'],
            })
            await update_job(status="error", error_message=whisper_result['error'])
            return

        if not whisper_result.get('transcript'):
            logger.warning(f"[job {job_id}] AssemblyAI returned empty transcript — no speech detected")
            _track_event(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube',
                'error_type': 'no_speech', 'error_message': 'no_speech_detected',
            })
            await update_job(status="error", error_message="no_speech_detected")
            return

        # Step 7: Save + complete
        await update_job(status="saving")

        transcript = [
            {'text': item['text'], 'offset': item['offset'], 'duration': item['duration']}
            for item in whisper_result['transcript']
        ]

        audio_duration = whisper_result.get('duration', 0)
        last_segment = transcript[-1] if transcript else None
        transcript_end = (last_segment['offset'] + last_segment['duration']) if last_segment else 0
        gap = audio_duration - transcript_end if audio_duration > 0 else 0
        truncation_warning = (
            f"Transcript may be incomplete — last {int(gap)} seconds of audio were not transcribed."
            if gap > 60 else None
        )
        if truncation_warning:
            logger.warning(f"[job {job_id}] Truncation: audio={audio_duration:.1f}s end={transcript_end:.1f}s gap={gap:.1f}s")

        processing_time_ms = int((time.time() - whisper_start_time) * 1000)
        _track_event(user_id, 'whisper_completed', {
            'video_id': video_id, 'source_type': 'youtube',
            'duration_seconds': duration, 'processing_time_ms': processing_time_ms,
            'credits_used': credit_cost,
        })

        sample_text = ' '.join(item['text'] for item in transcript[:20])
        language = None
        if sample_text.strip():
            detected = _lingua_detector.detect_language_of(sample_text)
            if detected:
                language = detected.iso_code_639_1.name.lower()

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

        result = await asyncio.to_thread(
            lambda: supabase.table('transcripts').insert(insert_data).execute()
        )
        transcript_id = result.data[0]['id']

        job_completed_at = datetime.now(timezone.utc)
        processing_time_seconds = (job_completed_at - job_started_at).total_seconds()
        logger.info(f"[job {job_id}] Complete: {len(transcript)} segments, {credit_cost} credits, transcript_id={transcript_id}, {processing_time_seconds:.1f}s")
        await update_job(
            status="complete",
            transcript_id=transcript_id,
            duration_seconds=int(duration),
            credits_cost=credit_cost,
            completed_at=job_completed_at.isoformat(),
            processing_time_seconds=int(processing_time_seconds),
            **({"error_message": truncation_warning} if truncation_warning else {}),
        )
        credits_deducted = False  # success — no refund

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
        if credits_deducted and credit_cost > 0:
            try:
                await asyncio.to_thread(add_credits, user_id, credit_cost, f"whisper_timeout | job_id={job_id}")
                logger.info(f"[job {job_id}] Refunded {credit_cost} credits to user {user_id}")
            except Exception as e:
                logger.error(f"[job {job_id}] Failed to refund {credit_cost} credits: {e}")
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                logger.warning(f"[job {job_id}] Failed to clean up temp file {f}: {e}")


async def noop_task(ctx: dict) -> str:
    """Fase 1 stub — verifieer dat worker jobs oppikt uit de queue."""
    return "ok"


class WorkerSettings:
    functions = [noop_task, run_whisper_job]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("UPSTASH_REDIS_URL") or "redis://localhost:6379"
    )
    keep_result = 3600  # bewaar resultaat 1u in Redis voor debugging
    # ack_late=False (default): job niet herkansen bij worker-crash.
    # Upgrade naar ack_late=True in Fase 4 zodra idempotency keys double credit deduction voorkomen.
