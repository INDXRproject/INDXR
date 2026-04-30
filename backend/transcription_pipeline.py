"""
AssemblyAI transcription pipeline.
Shared between worker.run_whisper_job (standalone YouTube jobs via ARQ)
and worker.process_playlist_video (playlist chain, Whisper path).
Also used by main.py for the upload path (asyncio.create_task).
"""
import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import posthog
from lingua import Language, LanguageDetectorBuilder

from audio_utils import (
    MembersOnlyVideoError,
    MEMBERS_ONLY_KEYWORDS,
    compress_audio_if_needed,
    extract_youtube_audio,
    get_audio_duration,
    validate_audio_file,
)
from assemblyai_client import transcribe_with_assemblyai
from credit_manager import (
    add_credits,
    calculate_credit_cost,
    check_user_balance,
    deduct_credits,
    get_supabase_client,
)
from youtube_utils import get_proxy_url

logger = logging.getLogger("indxr-pipeline")

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

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = "https://app.posthog.com"


async def _heartbeat_loop(heartbeat_fn, interval: int = 60) -> None:
    """Roept heartbeat_fn elke `interval` seconden aan totdat de task gecanceld wordt."""
    while True:
        await asyncio.sleep(interval)
        try:
            await heartbeat_fn()
        except Exception:
            pass  # nooit crashen door heartbeat-fout


async def _run_with_heartbeat(awaitable, heartbeat_fn):
    """
    Voert `awaitable` uit terwijl `heartbeat_fn` elke 60s op de achtergrond tikt.
    Als heartbeat_fn None is, wordt awaitable direct uitgevoerd (geen overhead).
    """
    if heartbeat_fn is None:
        return await awaitable
    task = asyncio.create_task(_heartbeat_loop(heartbeat_fn))
    try:
        return await awaitable
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


def _track(distinct_id: str, event: str, properties: Optional[dict] = None) -> None:
    if not posthog.api_key:
        return
    try:
        posthog.capture(distinct_id=distinct_id, event=event, properties=properties or {})
    except Exception as e:
        logger.warning(f"PostHog tracking failed: {e}")


def _classify_download_error(
    error_msg: str,
    *,
    video_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> str:
    """Map a download error string to a canonical error_type slug."""
    lower = error_msg.lower()
    if any(kw in lower for kw in MEMBERS_ONLY_KEYWORDS):
        return 'members_only'
    if any(kw in lower for kw in ('age-restricted', 'age restricted', 'only available on youtube', 'confirm your age')):
        return 'age_restricted'
    if any(kw in lower for kw in ('sign in to confirm', 'confirming you', 'not a bot', '429', 'too many requests')):
        return 'bot_detection'
    if any(kw in lower for kw in ('timed out', 'timeout', 'read timed out', '504', 'gateway timeout')):
        return 'timeout'
    if '152' in error_msg or 'unavailable' in lower:
        return 'youtube_restricted'
    logger.warning(
        f"[extraction_error:unclassified] raw={error_msg!r} "
        f"video_id={video_id} job_id={job_id}"
    )
    return 'extraction_error'


async def do_assemblyai_transcription(
    user_id: str,
    video_id: Optional[str],
    *,
    job_id: Optional[str] = None,
    audio_path: Optional[str] = None,
    audio_title: Optional[str] = None,
    collection_id: Optional[str] = None,
    deduct_credits_on_success: bool = True,
    proxy_session_id: Optional[str] = None,
    heartbeat_fn=None,
) -> dict:
    """
    Full AssemblyAI transcription pipeline.

    YouTube path: video_id provided, audio_path=None  → download audio via yt-dlp
    Upload path:  audio_path provided, video_id=None  → skip download step

    When job_id is given, updates the transcription_jobs Supabase row with
    intermediate status (downloading / transcribing / saving / complete / error).

    Returns:
        {"success": True,  "transcript_id": str, "credit_cost": int, ...}
        {"success": False, "error_type": str, "error_message": str, "credit_cost": int}
    """
    supabase = get_supabase_client()
    job_started_at = datetime.now(timezone.utc)
    temp_files: list = []
    credit_cost = 0
    credits_deducted = False

    async def _update_job(**kwargs):
        if not job_id:
            return
        now = datetime.now(timezone.utc)
        kwargs['updated_at'] = now.isoformat()
        if kwargs.get('status') in ('complete', 'error') and 'completed_at' not in kwargs:
            kwargs['completed_at'] = now.isoformat()
            kwargs['processing_time_seconds'] = int((now - job_started_at).total_seconds())
        await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs').update(kwargs).eq('id', job_id).execute()
        )

    try:
        video_title = audio_title or video_id or 'Untitled'
        channel: Optional[str] = None

        # ── Step 1: Get audio ─────────────────────────────────────────────────
        if audio_path is None:
            # YouTube path: download audio via yt-dlp
            await _update_job(status="downloading", started_at=job_started_at.isoformat())
            logger.info(f"[pipeline] Downloading YouTube audio: video={video_id} job={job_id}")
            proxy_url = get_proxy_url(session_id=proxy_session_id)
            if proxy_url:
                logger.info(f"[pipeline] Proxy ENABLED for {video_id}")
            else:
                logger.warning(f"[pipeline] Proxy DISABLED for {video_id}")
            try:
                audio_path, video_title, channel = await _run_with_heartbeat(
                    asyncio.to_thread(extract_youtube_audio, video_id, proxy_url=proxy_url),
                    heartbeat_fn,
                )
                temp_files.append(audio_path)
            except MembersOnlyVideoError:
                await _update_job(status="error", error_message="members_only")
                return {"success": False, "error_type": "members_only", "credit_cost": 0}
            except Exception as e:
                error_msg = str(e)
                if any(kw in error_msg.lower() for kw in MEMBERS_ONLY_KEYWORDS):
                    await _update_job(status="error", error_message="members_only")
                    return {"success": False, "error_type": "members_only", "credit_cost": 0}
                error_type = _classify_download_error(error_msg, video_id=video_id, job_id=job_id)
                _track(user_id, 'whisper_failed', {
                    'video_id': video_id, 'source_type': 'youtube',
                    'error_type': error_type, 'error_message': error_msg,
                })
                await _update_job(status="error", error_message=error_msg, error_type=error_type)
                return {"success": False, "error_type": error_type, "error_message": error_msg, "credit_cost": 0}

        # ── Step 2: Validate ──────────────────────────────────────────────────
        validation = await asyncio.to_thread(validate_audio_file, audio_path)
        if not validation['valid']:
            await _update_job(status="error", error_message=validation['error'])
            return {"success": False, "error_type": "validation_error", "error_message": validation['error'], "credit_cost": 0}

        # ── Step 3: Duration ──────────────────────────────────────────────────
        try:
            duration = await asyncio.to_thread(get_audio_duration, audio_path)
        except Exception as e:
            msg = f"Could not determine audio duration: {e}"
            await _update_job(status="error", error_message=msg)
            return {"success": False, "error_type": "duration_error", "error_message": msg, "credit_cost": 0}

        # ── Step 4: Credit check + deduction ─────────────────────────────────
        credit_cost = calculate_credit_cost(duration)
        if deduct_credits_on_success:
            try:
                balance = await asyncio.to_thread(check_user_balance, user_id)
            except Exception as e:
                msg = f"Could not check credit balance: {e}"
                await _update_job(status="error", error_message=msg)
                return {"success": False, "error_type": "credit_check_error", "error_message": msg, "credit_cost": 0}

            if balance < credit_cost:
                logger.warning(f"[pipeline] Insufficient credits: has {balance}, needs {credit_cost} (job={job_id})")
                await _update_job(status="error", error_message="Insufficient credits")
                return {"success": False, "error_type": "insufficient_credits", "credit_cost": 0}

            deduction_result = await asyncio.to_thread(
                deduct_credits,
                user_id=user_id,
                amount=credit_cost,
                reason="AssemblyAI transcription",
                metadata={
                    'source_type': 'youtube' if video_id else 'upload',
                    'duration_seconds': duration,
                    'video_id': video_id,
                    'job_id': job_id,
                },
            )
            if not deduction_result.get('success'):
                logger.error(f"[pipeline] Credit deduction failed: {deduction_result.get('error')}")
                await _update_job(status="error", error_message="Credit deduction failed")
                return {"success": False, "error_type": "credit_deduction_failed", "credit_cost": 0}
            credits_deducted = True
            _track(user_id, 'credits_deducted', {
                'amount': credit_cost, 'reason': 'whisper',
                'balance_after': deduction_result.get('new_balance'),
            })
            # Persist flag best-effort: bij worker-restart slaat B2 de deductie over.
            if job_id:
                try:
                    await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs')
                            .update({'credits_deducted': True})
                            .eq('id', job_id).execute()
                    )
                except Exception:
                    pass

        # ── Step 5: Compress if >25 MB ────────────────────────────────────────
        if validation['size_mb'] > 25:
            logger.info(f"[pipeline] Audio exceeds 25MB, compressing (job={job_id})")
            try:
                compressed = await asyncio.to_thread(compress_audio_if_needed, audio_path)
                if compressed != audio_path:
                    temp_files.append(compressed)
                    audio_path = compressed
            except Exception as e:
                msg = f"Audio compression failed: {e}"
                await _update_job(status="error", error_message=msg)
                return {"success": False, "error_type": "compression_error", "error_message": msg, "credit_cost": credit_cost}

        # ── Step 6: Transcribe ────────────────────────────────────────────────
        await _update_job(status="transcribing", started_at=job_started_at.isoformat())
        logger.info(f"[pipeline] Calling AssemblyAI: duration={duration:.1f}s cost={credit_cost}cr job={job_id}")
        _track(user_id, 'whisper_started', {
            'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
            'duration_seconds': duration,
        })
        assemblyai_start = time.time()
        whisper_result = await _run_with_heartbeat(
            asyncio.to_thread(transcribe_with_assemblyai, str(audio_path)),
            heartbeat_fn,
        )

        if not whisper_result['success']:
            _track(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
                'error_type': 'api_error', 'error_message': whisper_result['error'],
            })
            await _update_job(status="error", error_message=whisper_result['error'])
            return {"success": False, "error_type": "api_error", "error_message": whisper_result['error'], "credit_cost": credit_cost}

        if not whisper_result.get('transcript'):
            _track(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
                'error_type': 'no_speech', 'error_message': 'no_speech_detected',
            })
            await _update_job(status="error", error_message="no_speech_detected")
            return {"success": False, "error_type": "no_speech", "credit_cost": credit_cost}

        # ── Step 7: Build transcript ──────────────────────────────────────────
        await _update_job(status="saving")

        transcript = [
            {'text': item['text'], 'offset': item['offset'], 'duration': item['duration']}
            for item in whisper_result['transcript']
        ]

        audio_duration = whisper_result.get('duration', 0)
        last_segment = transcript[-1] if transcript else None
        transcript_end = (last_segment['offset'] + last_segment['duration']) if last_segment else 0
        gap = audio_duration - transcript_end if audio_duration > 0 else 0
        truncation_warning: Optional[str] = (
            f"Transcript may be incomplete — last {int(gap)} seconds of audio were not transcribed."
            if gap > 60 else None
        )
        if truncation_warning:
            logger.warning(f"[pipeline] Truncation: audio={audio_duration:.1f}s end={transcript_end:.1f}s gap={gap:.1f}s job={job_id}")

        sample_text = ' '.join(item['text'] for item in transcript[:20])
        language: Optional[str] = None
        if sample_text.strip():
            try:
                detected = _lingua_detector.detect_language_of(sample_text)
                if detected:
                    language = detected.iso_code_639_1.name.lower()
            except Exception:
                pass

        # ── Step 8: Save to Supabase ─────────────────────────────────────────
        char_count = sum(len(item.get('text', '')) for item in transcript)
        insert_data: dict = {
            'user_id': user_id,
            'video_id': video_id,
            'title': video_title,
            'transcript': transcript,
            'duration': int(duration),
            'processing_method': 'assemblyai',
            'character_count': char_count,
        }
        if channel:
            insert_data['channel'] = channel
        if language:
            insert_data['language'] = language
        if collection_id:
            insert_data['collection_id'] = collection_id

        result = await asyncio.to_thread(
            lambda: supabase.table('transcripts').insert(insert_data).execute()
        )
        transcript_id = result.data[0]['id']

        processing_ms = int((time.time() - assemblyai_start) * 1000)
        _track(user_id, 'whisper_completed', {
            'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
            'duration_seconds': duration, 'processing_time_ms': processing_ms,
            'credits_used': credit_cost,
        })

        processing_secs = int((datetime.now(timezone.utc) - job_started_at).total_seconds())
        logger.info(f"[pipeline] Complete: {len(transcript)} segments, {credit_cost}cr, transcript_id={transcript_id}, job={job_id}, {processing_secs}s")
        await _update_job(
            status="complete",
            transcript_id=transcript_id,
            duration_seconds=int(duration),
            credits_cost=credit_cost,
            processing_time_seconds=processing_secs,
            **({"error_message": truncation_warning} if truncation_warning else {}),
        )
        credits_deducted = False  # success — no refund

        return {
            "success": True,
            "transcript_id": transcript_id,
            "credit_cost": credit_cost,
            "duration_seconds": int(duration),
            "truncation_warning": truncation_warning,
        }

    except Exception as e:
        logger.error(f"[pipeline] Unexpected error: {type(e).__name__}: {e} (job={job_id})")
        try:
            await _update_job(status="error", error_message=f"Internal error: {e}")
        except Exception:
            pass
        return {
            "success": False,
            "error_type": "internal_error",
            "error_message": str(e),
            "credit_cost": credit_cost,
        }

    finally:
        if credits_deducted and credit_cost > 0:
            try:
                await asyncio.to_thread(
                    add_credits, user_id, credit_cost, f"Refund: transcription failed | job={job_id}"
                )
                logger.info(f"[pipeline] Refunded {credit_cost}cr to {user_id} (job={job_id})")
            except Exception as e:
                logger.error(f"[pipeline] Failed to refund {credit_cost}cr: {e}")
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                logger.warning(f"[pipeline] Failed to clean temp file {f}: {e}")
