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
import sentry_sdk
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
    settle_credits,
    refund_credits,
    get_supabase_client,
)
from youtube_utils import get_proxy_url
from language_utils import normalize_language_code
from master_cache import master_transcripts_read, master_transcripts_write, CURRENT_PRODUCTION_AI_MODEL

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
    if any(kw in lower for kw in ('bytes read', 'more expected', 'incomplete read')):
        # HTTP content-length mismatch after all retry attempts — residential proxy
        # dropped mid-download. See ADR-031.
        return 'partial_write'
    if '152' in error_msg or 'unavailable' in lower:
        return 'youtube_restricted'
    logger.warning(
        f"[extraction_error:unclassified] raw={error_msg!r} "
        f"video_id={video_id} job_id={job_id}"
    )
    return 'extraction_error'


async def refund_with_retry(
    job_id: Optional[str] = None,
    playlist_id: Optional[str] = None,
    *,
    attempts: int = 3,
    base_delay: float = 1.0,
    context: str = "",
) -> dict:
    """Terminale refund met bounded idempotente retry (ADR-050 crash-recovery). Gebruikt door de
    whisper-success-wrapper én de twee playlist-completion-transities — géén van die paden heeft
    een watchdog-vangnet (whisper-success zet transcript_id, playlist-completion zet
    status='complete' → buiten Pass 2/2b). Een transient 522 zou daar stil het schattingsverschil
    verliezen. refund_credits is idempotent via de partiële UNIQUE (job_id/playlist_id,'refund'),
    dus herproberen dubbel-refundt NOOIT. Pas error-Sentry als ÁLLE pogingen falen; het residuele
    crash-tussen-status-en-refund-gat wordt door de watchdog Pass 2c-reconciliatie gedekt."""
    last = None
    for i in range(attempts):
        r = await asyncio.to_thread(refund_credits, job_id, playlist_id)
        if r and r.get('success'):
            return r
        last = r
        if i < attempts - 1:
            await asyncio.sleep(base_delay * (i + 1))  # 1s, 2s
    logger.error(f"[refund] terminale refund FAILED na {attempts} pogingen ({context}): {last}")
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("refund_failed", "true")
        scope.set_tag("refund_context", context)
        scope.set_tag("ref_id", str(job_id or playlist_id))
        scope.set_extra("refund_result", last)
    sentry_sdk.capture_message(
        f"Terminal refund failed after {attempts} retries (silent-loss risk, no watchdog fallback): {context}",
        level="error",
    )
    return last or {'success': False, 'error': 'refund_with_retry exhausted'}


async def run_whisper_reservation_aware(
    user_id: str,
    video_id: Optional[str],
    *,
    job_id: str,
    **pipeline_kwargs,
) -> dict:
    """
    Reservation-aware wrapper rond do_assemblyai_transcription voor STANDALONE whisper-jobs
    (worker.run_whisper_job, het upload-pad en de arq-loze youtube-fallback). ADR-050 fase 2.

    KRITIEK: `reserve_credits` draait in main.py vóór de source_type-splitsing, dus ELK pad dat
    daarna de pipeline aanroept moet reservation-aware zijn mét refund-hook — anders vuren
    reserve + de oude per-video-aftrek samen = DUBBELE aftrek bij flag ON (en de reservering
    wordt nooit teruggeboekt). Deze wrapper is de ENIGE dispatch-primitief voor standalone jobs
    zodat die bedrading niet per call-site kan driften.

    Leest credits_deducted + credits_reserved van de EIGEN transcription_jobs-rij:
      - reservation_mode = credits_reserved > 0  → pipeline skipt de oude aftrek en settelt het
        werkelijke verbruik; ná afloop verrekent refund_credits(job_id) de reservering
        (reserved − settled) op success (refund=verschil) én failure (refund=alles), idempotent
        via (job_id,'refund').
      - anders (flag OFF / niet gereserveerd) → ongewijzigd oude gedrag (directe aftrek).
    Fail-safe bij read-fout: already_deducted=True + reservation_mode=False (liever gratis dan
    dubbel). Playlist-whisper gebruikt deze wrapper NIET — die refundt op playlist-niveau
    (worker.process_playlist_video / process_playlist_retries).
    """
    supabase = get_supabase_client()
    try:
        row = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('credits_deducted,credits_reserved')
                .eq('id', job_id).single().execute()
        )
        already_deducted = bool(row.data and row.data.get('credits_deducted'))
        reservation_mode = bool(row.data and (row.data.get('credits_reserved') or 0) > 0)
    except Exception as e:
        logger.warning(
            f"[run_whisper_reservation_aware] credits_deducted/reserved read failed for "
            f"{job_id}: {e} — defaulting to already_deducted=True, reservation_mode=False (safe)"
        )
        already_deducted = True
        reservation_mode = False

    result = await do_assemblyai_transcription(
        user_id,
        video_id,
        job_id=job_id,
        deduct_credits_on_success=not already_deducted,
        reservation_mode=reservation_mode,
        **pipeline_kwargs,
    )
    # ADR-050 fase 2: gereserveerde job → verreken aan het eind (reserved − settled). Vuurt op
    # success (refund=verschil) én failure (refund=alles), idempotent via (job_id,'refund').
    if reservation_mode:
        # Terminale refund: whisper-success zet transcript_id → buiten Pass 2. Bounded idempotente
        # retry (refund_credits idempotent via (job_id,'refund')); alarmeert als álle pogingen falen.
        # Residueel crash-gap wordt door de watchdog Pass 2c-reconciliatie gedekt.
        await refund_with_retry(job_id, None, context="whisper-success")
    return result


async def do_assemblyai_transcription(
    user_id: str,
    video_id: Optional[str],
    *,
    job_id: Optional[str] = None,
    audio_path: Optional[str] = None,
    audio_title: Optional[str] = None,
    collection_id: Optional[str] = None,
    deduct_credits_on_success: bool = True,
    reservation_mode: bool = False,
    playlist_id: Optional[str] = None,
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

        # ── Step 0: master_transcripts cache check (AI warm path, YouTube only) ──
        # Upload path (video_id=None) has no cache entry — skip.
        if video_id is not None:
            mc = await master_transcripts_read(video_id, source_method="audio_transcription")
            if mc is not None:
                logger.info(f"[pipeline] CACHE HIT: video={video_id} model={mc['transcription_model']} job={job_id}")
                duration_sec = mc.get("duration_seconds") or 0
                credit_cost = calculate_credit_cost(duration_sec)
                # Reservation-mode: balans is al bij reserve bewogen -> geen aftrek hier;
                # settlement volgt op success. Cache-hit-verbruik = de gecachte duur (werkelijk).
                if deduct_credits_on_success and not reservation_mode:
                    try:
                        balance = await asyncio.to_thread(check_user_balance, user_id)
                    except Exception as e:
                        msg = f"Could not check credit balance: {e}"
                        await _update_job(status="error", error_message=msg)
                        return {"success": False, "error_type": "credit_check_error", "error_message": msg, "credit_cost": 0}
                    if balance < credit_cost:
                        await _update_job(status="error", error_message="Insufficient credits")
                        return {"success": False, "error_type": "insufficient_credits", "credit_cost": 0}
                    deduction_result = await asyncio.to_thread(
                        deduct_credits,
                        user_id=user_id,
                        amount=credit_cost,
                        reason="AssemblyAI transcription (cache hit)",
                        metadata={
                            'source_type': 'youtube',
                            'duration_seconds': duration_sec,
                            'video_id': video_id,
                            'job_id': job_id,
                        },
                    )
                    if not deduction_result.get('success'):
                        await _update_job(status="error", error_message="Credit deduction failed")
                        return {"success": False, "error_type": "credit_deduction_failed", "credit_cost": 0}
                    credits_deducted = True
                    if job_id:
                        try:
                            await asyncio.to_thread(
                                lambda: supabase.table('transcription_jobs')
                                    .update({'credits_deducted': True})
                                    .eq('id', job_id).execute()
                            )
                        except Exception:
                            pass
                char_count = sum(len(s.get("text", "")) for s in mc["transcript"])
                insert_data: dict = {
                    "user_id": user_id,
                    "video_id": video_id,
                    "title": mc.get("title") or video_title,
                    "transcript": mc["transcript"],
                    "duration": duration_sec,
                    "character_count": char_count,
                    "processing_method": "assemblyai",
                }
                if mc.get("language"):
                    insert_data["language"] = mc["language"]
                if mc.get("channel"):
                    insert_data["channel"] = mc["channel"]
                if collection_id:
                    insert_data["collection_id"] = collection_id
                t = await asyncio.to_thread(
                    lambda d=insert_data: supabase.table("transcripts").insert(d).execute()
                )
                transcript_id = t.data[0]["id"]
                await _update_job(
                    status="complete",
                    transcript_id=transcript_id,
                    credits_cost=credit_cost,
                )
                credits_deducted = False  # success — no refund
                if reservation_mode and credit_cost > 0:
                    # Draw-down uit de reservering: registreer werkelijk verbruik (balans-neutraal).
                    await asyncio.to_thread(
                        settle_credits, user_id, credit_cost, job_id, playlist_id, video_id,
                        "AI transcriptie settlement (cache hit)",
                    )
                logger.info(f"[pipeline] Cache hit complete: transcript_id={transcript_id} {credit_cost}cr job={job_id}")
                return {
                    "success": True,
                    "transcript_id": transcript_id,
                    "credit_cost": credit_cost,
                    "duration_seconds": duration_sec,
                }

        # ── Step 1: Get audio ─────────────────────────────────────────────────
        if audio_path is None:
            # YouTube path: download audio via yt-dlp
            await _update_job(status="downloading", started_at=job_started_at.isoformat())
            logger.info(f"[pipeline] Downloading YouTube audio: video={video_id} job={job_id}")
            proxy_url = get_proxy_url(session_id=proxy_session_id)
            if proxy_url:
                logger.info(f"[pipeline] Proxy ENABLED for {video_id}")
                # Build per-attempt proxy URLs with rotated session IDs so that
                # each retry uses a fresh Decodo residential exit IP. When the
                # previous IP went offline mid-download (partial_write error),
                # retrying with the same IP always fails. See ADR-031.
                if proxy_session_id:
                    proxy_urls = [
                        get_proxy_url(session_id=f"{proxy_session_id}-r{i}")
                        for i in range(1, 4)
                    ]
                else:
                    # No pinned session — each get_proxy_url() call generates a
                    # random sid, so rotation happens automatically.
                    proxy_urls = [get_proxy_url() for _ in range(3)]
            else:
                logger.warning(f"[pipeline] Proxy DISABLED for {video_id}")
                proxy_urls = None
            try:
                audio_path, video_title, channel = await _run_with_heartbeat(
                    asyncio.to_thread(extract_youtube_audio, video_id, proxy_urls=proxy_urls),
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
                # bot_detection/timeout/members_only zijn verwachte operationele uitkomsten, geen bugs.
                if error_type not in ('bot_detection', 'timeout', 'members_only', 'no_captions'):
                    with sentry_sdk.push_scope() as scope:
                        scope.set_tag("pipeline", "do_assemblyai_transcription")
                        scope.set_tag("step", "audio_download")
                        scope.set_tag("job_id", job_id or "unknown")
                        scope.set_tag("video_id", video_id or "upload")
                        scope.set_tag("error_type", error_type)
                        scope.set_tag("user_id", user_id)
                    sentry_sdk.capture_exception(e)
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
        # Reservation-mode: het saldo is al bij reserve gereserveerd -> sla de pre-transcribe
        # aftrek + balanscheck over; settlement (werkelijke duur) volgt op success.
        if deduct_credits_on_success and not reservation_mode:
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
                    language = normalize_language_code(detected.iso_code_639_1.name.lower())
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

        # Best-effort master cache write — YouTube-pad only (privacy-grens), alleen als
        # taal bekend is (language TEXT NOT NULL; 'unknown' forceren vervuilt de cache).
        if video_id is not None and language:
            asyncio.create_task(master_transcripts_write(
                video_id=video_id,
                language=language,
                model=CURRENT_PRODUCTION_AI_MODEL,
                transcript_data=transcript,
                duration_seconds=int(duration),
                source_method='audio_transcription',
                title=video_title or None,
                channel=channel or None,
            ))

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
        if reservation_mode and credit_cost > 0:
            # Draw-down uit de reservering: registreer het WERKELIJKE verbruik (balans-neutraal).
            await asyncio.to_thread(
                settle_credits, user_id, credit_cost, job_id, playlist_id, video_id,
                "AI transcriptie settlement",
            )

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
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("pipeline", "do_assemblyai_transcription")
            scope.set_tag("job_id", job_id or "unknown")
            scope.set_tag("user_id", user_id)
            scope.set_tag("video_id", video_id or "upload")
            scope.set_extra("credit_cost", credit_cost)
        sentry_sdk.capture_exception(e)
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
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("pipeline", "do_assemblyai_transcription")
                    scope.set_tag("step", "credit_refund")
                    scope.set_tag("job_id", job_id or "unknown")
                    scope.set_tag("user_id", user_id)
                    scope.set_extra("credit_cost", credit_cost)
                sentry_sdk.capture_exception(e)
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                logger.warning(f"[pipeline] Failed to clean temp file {f}: {e}")
