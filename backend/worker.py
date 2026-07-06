"""
ARQ worker — INDXR.AI

Aparte Railway service naast de FastAPI API-service.
Start: python -m arq worker.WorkerSettings

Fase 2: run_whisper_job (YouTube-only standalone transcription).
Fase 3: process_playlist_video + process_playlist_retries (per-video chain).
Upload-pad blijft op asyncio.create_task in main.py — bytes zijn niet queue-serializable.
"""

import asyncio
import logging
import os
import urllib.parse
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import posthog
import sentry_sdk
from arq import cron, func as arq_func
from arq.connections import RedisSettings
from dotenv import load_dotenv

from audio_utils import MembersOnlyVideoError
from credit_manager import (
    add_credits,
    check_user_balance,
    refund_credits,
    get_supabase_client,
)
from transcription_pipeline import (
    _classify_download_error,
    _run_with_heartbeat,
    do_assemblyai_transcription,
)
from master_cache import master_transcripts_read, master_transcripts_write
from youtube_client import YouTubeClient
from youtube_utils import extract_via_youtube_transcript_api, extract_with_ytdlp
from language_utils import normalize_language_code

# Namespace voor deterministische Whisper job-IDs in de playlist-keten.
# uuid5(WHISPER_NS, "{playlist_id}:{video_id}") geeft stabiele ID over worker-restarts.
_WHISPER_NS = _uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # uuid.NAMESPACE_URL

load_dotenv()

_yt_client = YouTubeClient()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True,
)
logger = logging.getLogger("indxr-worker")
logger.setLevel(logging.INFO)
# Force root logger to INFO — zelfde Sentry-override probleem als main.py.
logging.getLogger().setLevel(logging.INFO)

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
)

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = "https://app.posthog.com"


def _track_event(distinct_id: str, event: str, properties: Optional[dict] = None) -> None:
    if not posthog.api_key:
        return
    try:
        posthog.capture(distinct_id=distinct_id, event=event, properties=properties or {})
    except Exception as e:
        logger.warning(f"PostHog tracking failed: {e}")


# ── ARQ Tasks ────────────────────────────────────────────────────────────────


async def run_whisper_job(
    ctx: dict,
    job_id: str,
    user_id: str,
    video_id: str,
    title: Optional[str] = None,
) -> None:
    """
    ARQ task: standalone YouTube Whisper transcription.

    Fase 4: idempotency-check via credits_deducted vlag + heartbeat op transcription_jobs.
    Bij read-failure defaultt already_deducted=True (fail-safe: liever gratis dan dubbel).
    ack_late=True wordt deployed in sessie D, nadat alle idempotency-vlaggen live zijn.
    """
    logger.info(f"→ run_whisper_job(job_id={job_id!r}, video={video_id!r})")
    supabase = get_supabase_client()

    # Idempotency: lees credits_deducted vóór de pipeline-call.
    # Fail-safe default=True: bij Supabase read-fout liever één gratis transcriptie
    # dan een dubbele aftrek bij ack_late-retry.
    try:
        row = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('credits_deducted,credits_reserved')
                .eq('id', job_id).single().execute()
        )
        already_deducted = bool(row.data and row.data.get('credits_deducted'))
        # Reservation-mode uit de EIGEN standalone-job-rij (die is bij start gereserveerd).
        reservation_mode = bool(row.data and (row.data.get('credits_reserved') or 0) > 0)
    except Exception as e:
        logger.warning(
            f"[run_whisper_job] credits_deducted read failed for {job_id}: {e} "
            f"— defaulting to already_deducted=True (safe)"
        )
        already_deducted = True
        reservation_mode = False

    async def _hb() -> None:
        await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .update({'last_heartbeat_at': datetime.now(timezone.utc).isoformat()})
                .eq('id', job_id).execute()
        )

    result = await do_assemblyai_transcription(
        user_id,
        video_id,
        job_id=job_id,
        audio_title=title,
        proxy_session_id=job_id[:8],
        deduct_credits_on_success=not already_deducted,
        reservation_mode=reservation_mode,
        heartbeat_fn=_hb,
    )
    # ADR-050 fase 2: gereserveerde standalone job -> verreken aan het eind
    # (reserved − settled). Vuurt op success (refund=verschil) én failure (refund=alles),
    # idempotent via (job_id,'refund').
    if reservation_mode:
        await asyncio.to_thread(refund_credits, job_id, None)
    if result['success']:
        logger.info(f"← run_whisper_job ● (transcript_id={result['transcript_id']}, {result['credit_cost']}cr)")
    else:
        logger.warning(f"← run_whisper_job ✗ (error_type={result.get('error_type')})")


async def _process_caption_video(
    supabase,
    user_id: str,
    video_id: str,
    is_free: bool,
    collection_id: Optional[str],
    proxy_session: str,
    playlist_id: str,
    heartbeat_fn=None,
) -> tuple:
    """
    Extract captions for one playlist video and save a transcript row.

    Returns (success: bool, transcript_id: str | None, error_type: str | None, credit_amount: int).
    credit_amount is 1 for paid videos, 0 for free (first 3). The actual deduction happens
    atomically inside update_playlist_video_progress (M3) via p_amount — not here.
    Raises MembersOnlyVideoError or Exception on hard errors — caller handles them.
    """
    if not is_free:
        balance = await asyncio.to_thread(check_user_balance, user_id)
        if balance < 1:
            return False, None, 'insufficient_credits', 0

    # ── Language pre-fetch for master cache lookup ────────────────────────
    # get_video_details is called anyway for cascade metadata enrichment below.
    # Hoisting it here lets us do a language-aware master cache lookup and
    # reuse the result for cascade enrichment (zero extra quota units).
    # On failure: normalised_lang=None → skip master cache → proceed to cascade.
    normalised_lang: Optional[str] = None
    pre_meta: dict = {}
    try:
        pre_meta = await asyncio.to_thread(_yt_client.get_video_details, video_id)
        normalised_lang = normalize_language_code(pre_meta.get('language'))
    except Exception as pre_meta_err:
        err_str = str(pre_meta_err)
        if 'quotaExceeded' in err_str or ('403' in err_str and 'quota' in err_str.lower()):
            logger.warning(f"[YT-DATA-API quota exceeded] pre-fetch {video_id}: {pre_meta_err}")
        else:
            logger.warning(f"[YT-DATA-API pre-fetch failed] {video_id}: {pre_meta_err}")

    # ── master_transcripts cache check (warm path) ────────────────────────
    if normalised_lang is not None:
        mc = await master_transcripts_read(video_id, source_method="caption_extraction", language=normalised_lang)
        if mc is not None:
            logger.info(f"[CACHE HIT] caption playlist {playlist_id} video={video_id} lang={normalised_lang}")
            char_count = sum(len(s["text"]) for s in mc["transcript"])
            duration = mc.get("duration_seconds") or 0
            insert_data: dict = {
                "user_id": user_id,
                "source_type": "youtube",
                "title": pre_meta.get("title", video_id),
                "transcript": mc["transcript"],
                "duration": duration,
                "character_count": char_count,
                "video_id": video_id,
                "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",
                "processing_method": "youtube_captions",
            }
            if collection_id:
                insert_data["collection_id"] = collection_id
            t = await asyncio.to_thread(
                lambda d=insert_data: supabase.table("transcripts").insert(d).execute()
            )
            transcript_id = t.data[0]["id"]
            credit_amount = 0 if is_free else 1
            return True, transcript_id, None, credit_amount

    # Cascade step 1: youtube-transcript-api (faster, no yt-dlp overhead)
    extract_result = await extract_via_youtube_transcript_api(video_id, session_id=proxy_session, lang_pref=normalised_lang)
    caption_model = "youtube_transcript_api"

    # ── Cascade step 1 metadata enrichment (reuse pre_meta if available) ──
    if extract_result is not None:
        if pre_meta:
            extract_result['title'] = pre_meta.get('title', video_id)
            extract_result['video_url'] = f"https://www.youtube.com/watch?v={video_id}"
            extract_result['duration'] = pre_meta.get('duration')
            extract_result['channel'] = pre_meta.get('channel')
            extract_result['upload_date'] = pre_meta.get('upload_date')
        else:
            try:
                meta = await asyncio.to_thread(_yt_client.get_video_details, video_id)
                extract_result['title'] = meta['title']
                extract_result['video_url'] = f"https://www.youtube.com/watch?v={video_id}"
                extract_result['duration'] = meta.get('duration')
                extract_result['channel'] = meta.get('channel')
                extract_result['upload_date'] = meta.get('upload_date')
            except Exception as meta_err:
                err_str = str(meta_err)
                if 'quotaExceeded' in err_str or ('403' in err_str and 'quota' in err_str.lower()):
                    logger.warning(f"[YT-DATA-API quota exceeded] {video_id}: {meta_err}")
                else:
                    logger.warning(f"[YT-DATA-API metadata fetch failed] {video_id}: {meta_err}")
                extract_result = None  # discard step 1, fall through to step 2

    # ── Cascade step 2: yt-dlp (ios/web_embedded) ────────────────────────
    if extract_result is None:
        try:
            extract_result = await _run_with_heartbeat(
                extract_with_ytdlp(video_id, use_proxy=True, session_id=proxy_session, lang_pref=normalised_lang),
                heartbeat_fn,
            )
            caption_model = "youtube_captions"
        except MembersOnlyVideoError:
            raise  # structural — step 3 cannot help
        except Exception as step2_err:
            # ── Cascade step 3: yt-dlp (tv/android client rotation) ──────
            logger.info(f"[CASCADE] {video_id}: step 2 failed ({type(step2_err).__name__}), trying step 3 (tv/android)")
            extract_result = await _run_with_heartbeat(
                extract_with_ytdlp(video_id, use_proxy=True, session_id=proxy_session, clients=['tv', 'android'], lang_pref=normalised_lang),
                heartbeat_fn,
            )
            caption_model = "youtube_captions_rotated"

    if not isinstance(extract_result, dict) or 'transcript' not in extract_result:
        return False, None, 'no_captions', 0

    transcript = extract_result['transcript']
    title_str = extract_result.get('title') or video_id
    char_count = sum(len(x['text']) for x in transcript)
    duration = int(max((x['offset'] + x['duration'] for x in transcript), default=0))

    insert_data: dict = {
        'user_id': user_id,
        'source_type': 'youtube',
        'title': title_str,
        'transcript': transcript,
        'duration': duration,
        'character_count': char_count,
        'video_id': video_id,
        'thumbnail_url': f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg',
        'processing_method': 'youtube_captions',
    }
    if collection_id:
        insert_data['collection_id'] = collection_id

    t = await asyncio.to_thread(
        lambda data=insert_data: supabase.table('transcripts').insert(data).execute()
    )
    transcript_id = t.data[0]['id']

    # Best-effort master cache write (fire-and-forget, never blocks user flow)
    lang = normalize_language_code(extract_result.get('language')) or 'en'
    asyncio.create_task(master_transcripts_write(
        video_id=video_id,
        language=lang,
        model=caption_model,
        transcript_data=transcript,
        duration_seconds=duration,
        source_method='caption_extraction',
        title=extract_result.get('title'),
        channel=extract_result.get('channel'),
    ))

    # Credit-deductie is verplaatst naar de update_playlist_video_progress RPC (M3).
    # Atomisch + idempotent via v_already_done — geen dubbele aftrek bij worker-restart.
    credit_amount = 0 if is_free else 1
    return True, transcript_id, None, credit_amount


async def _call_progress_rpc(supabase, playlist_id: str, video_id: str, success: bool,
                              transcript_id: Optional[str] = None, error_type: Optional[str] = None,
                              amount: int = 0) -> Optional[dict]:
    """Registreer video-progress via de RPC. Retourneert het RPC-resultaat
    ({playlist_complete, should_retry, ...}) of None bij fout — de caller gebruikt dit om
    op de completion-transitie de één-malige refund te triggeren (ADR-050 fase 2)."""
    try:
        params = {
            'p_playlist_id': playlist_id,
            'p_video_id': video_id,
            'p_status': 'success' if success else 'error',
            'p_amount': amount,
        }
        if success:
            params['p_transcript_id'] = transcript_id
        else:
            params['p_error_type'] = error_type or 'extraction_error'
        resp = await asyncio.to_thread(
            lambda: supabase.rpc('update_playlist_video_progress', params).execute()
        )
        return resp.data if resp else None
    except Exception as e:
        logger.error(f"[playlist {playlist_id}] RPC update failed for {video_id}: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "call_progress_rpc")
            scope.set_tag("playlist_job_id", playlist_id)
            scope.set_tag("video_id", video_id)
        sentry_sdk.capture_exception(e)
        return None


async def process_playlist_video(ctx: dict, playlist_id: str, video_index: int) -> None:
    """
    ARQ task: process one video in a playlist chain.

    Reads state from Supabase, processes the video, writes the result via the
    update_playlist_video_progress RPC, then enqueues the next video (or the
    retry pass if this is the last video with retryable failures).

    _job_id = "{playlist_id}:{video_index}" — guaranteed by the enqueue call in
    start_playlist_extraction and in this function itself.
    keep_result=0 avoids the 1-hour ARQ uniqueness lock after completion.
    """
    supabase = get_supabase_client()
    log_prefix = f"[playlist {playlist_id}:{video_index}]"

    try:
        row = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
            .select('user_id,video_ids,use_whisper_ids,collection_id,total_videos,video_results,credits_reserved')
            .eq('id', playlist_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error(f"{log_prefix} Failed to fetch job: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "process_playlist_video")
            scope.set_tag("playlist_job_id", playlist_id)
            scope.set_tag("video_index", str(video_index))
        sentry_sdk.capture_exception(e)
        return

    job = row.data
    if not job:
        logger.error(f"{log_prefix} Job not found")
        return

    video_ids: list = job['video_ids']
    user_id: str = job['user_id']
    collection_id: Optional[str] = job.get('collection_id')
    use_whisper_ids: set = set(job.get('use_whisper_ids') or [])
    total_videos: int = job['total_videos']
    video_results: dict = job.get('video_results') or {}
    # Reservation-mode uit de PLAYLIST-rij (playlist-niveau reservering). NIET uit de
    # per-video whisper_job-rij (die is nooit individueel gereserveerd -> credits_reserved=0).
    reservation_mode: bool = (job.get('credits_reserved') or 0) > 0

    if video_index >= len(video_ids):
        logger.error(f"{log_prefix} video_index out of bounds (total={len(video_ids)})")
        return

    video_id = video_ids[video_index]
    is_whisper = video_id in use_whisper_ids
    is_free = video_index < 3

    # Idempotency: skip if already succeeded (e.g. duplicate enqueue)
    existing = video_results.get(video_id, {})
    if existing.get('status') == 'success':
        logger.info(f"{log_prefix} {video_id} already done, skipping")
        await _enqueue_next(ctx, playlist_id, video_index, total_videos, video_results)
        return

    logger.info(f"{log_prefix} Processing {video_id} (whisper={is_whisper}, free={is_free})")
    proxy_session = f"{playlist_id[:4]}{video_index:04d}"

    rpc_success = False
    rpc_transcript_id: Optional[str] = None
    rpc_error_type: Optional[str] = None
    rpc_credit_amount: int = 0

    # Heartbeat-closure: schrijft naar playlist_extraction_jobs (niet transcription_jobs).
    # Poll-endpoint voor playlists checkt deze tabel op stale-detectie.
    async def _hb_playlist() -> None:
        await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .update({'last_heartbeat_at': datetime.now(timezone.utc).isoformat()})
                .eq('id', playlist_id).execute()
        )

    try:
        if is_whisper:
            # Deterministische job_id: stabiel over worker-restarts, voorkomt rij-duplicaten.
            whisper_job_id = str(_uuid.uuid5(_WHISPER_NS, f"{playlist_id}:{video_id}"))

            # Upsert idempotent: bestaande rij (bij replay) wordt niet overschreven.
            try:
                await asyncio.to_thread(
                    lambda: supabase.table('transcription_jobs').upsert({
                        'id': whisper_job_id,
                        'user_id': user_id,
                        'status': 'pending',
                        'source_type': 'youtube',
                        'video_url': f'https://www.youtube.com/watch?v={video_id}',
                    }, on_conflict='id', ignore_duplicates=True).execute()
                )
            except Exception as upsert_err:
                logger.warning(f"{log_prefix} transcription_jobs upsert failed for {whisper_job_id}: {upsert_err}")

            # Idempotency: fail-safe default=True (zie run_whisper_job voor rationale).
            try:
                cd_row = await asyncio.to_thread(
                    lambda: supabase.table('transcription_jobs')
                        .select('credits_deducted')
                        .eq('id', whisper_job_id).single().execute()
                )
                already_deducted = bool(cd_row.data and cd_row.data.get('credits_deducted'))
            except Exception as cd_err:
                logger.warning(
                    f"{log_prefix} credits_deducted read failed for {whisper_job_id}: {cd_err} "
                    f"— defaulting to already_deducted=True (safe)"
                )
                already_deducted = True

            result = await do_assemblyai_transcription(
                user_id, video_id,
                job_id=whisper_job_id,
                collection_id=collection_id,
                proxy_session_id=proxy_session,
                deduct_credits_on_success=not already_deducted,
                reservation_mode=reservation_mode,
                playlist_id=playlist_id,
                heartbeat_fn=_hb_playlist,
            )
            if result['success']:
                rpc_success = True
                rpc_transcript_id = result['transcript_id']
            else:
                rpc_error_type = result.get('error_type', 'extraction_error')
        else:
            rpc_success, rpc_transcript_id, rpc_error_type, rpc_credit_amount = await _process_caption_video(
                supabase, user_id, video_id, is_free, collection_id, proxy_session, playlist_id,
                heartbeat_fn=_hb_playlist,
            )

    except MembersOnlyVideoError:
        rpc_error_type = 'members_only'
    except Exception as e:
        rpc_error_type = _classify_download_error(str(e), video_id=video_id, job_id=f"{playlist_id}:{video_index}")
        logger.warning(f"{log_prefix} {video_id} failed ({rpc_error_type}): {e}")
        # bot_detection/timeout/members_only/no_captions zijn verwachte operationele uitkomsten, geen bugs.
        if rpc_error_type not in ('bot_detection', 'timeout', 'members_only', 'no_captions'):
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "process_playlist_video")
                scope.set_tag("playlist_job_id", playlist_id)
                scope.set_tag("video_id", video_id)
                scope.set_tag("error_type", rpc_error_type)
                scope.set_tag("user_id", user_id)
            sentry_sdk.capture_exception(e)

    rpc_result = await _call_progress_rpc(supabase, playlist_id, video_id, rpc_success, rpc_transcript_id, rpc_error_type,
                              amount=rpc_credit_amount)

    # Build final video_results for the last-video retry check
    final_video_results = {**video_results}
    if rpc_success:
        final_video_results[video_id] = {'status': 'success', 'transcript_id': rpc_transcript_id}
    else:
        final_video_results[video_id] = {'status': 'error', 'error_type': rpc_error_type}

    await _enqueue_next(ctx, playlist_id, video_index, total_videos, final_video_results)

    # ADR-050 fase 2: rondde deze video de playlist definitief af (compleet, geen retry) en is
    # er gereserveerd -> verreken één keer (reserved − Σsettlements). Idempotent via
    # (playlist_id,'refund'). Bij should_retry gebeurt de refund pas ná de retry-pass.
    if reservation_mode and rpc_result and rpc_result.get('playlist_complete') and not rpc_result.get('should_retry'):
        await asyncio.to_thread(refund_credits, None, playlist_id)


async def _enqueue_next(
    ctx: dict,
    playlist_id: str,
    video_index: int,
    total_videos: int,
    video_results: dict,
) -> None:
    if video_index < total_videos - 1:
        next_index = video_index + 1
        try:
            await ctx['redis'].enqueue_job(
                'process_playlist_video',
                playlist_id,
                next_index,
                _job_id=f"{playlist_id}:{next_index}",
            )
        except Exception as e:
            logger.error(f"[playlist {playlist_id}:{video_index}] Failed to enqueue next video ({next_index}): {e}")
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "enqueue_next")
                scope.set_tag("playlist_job_id", playlist_id)
                scope.set_tag("video_index", str(video_index))
            sentry_sdk.capture_exception(e)
    else:
        # Last video — check for retry-eligible failures
        retry_eligible = [
            v for v, r in video_results.items()
            if r.get('status') == 'error' and r.get('error_type') in ('bot_detection', 'timeout')
        ]
        if retry_eligible:
            try:
                await ctx['redis'].enqueue_job(
                    'process_playlist_retries',
                    playlist_id,
                    _job_id=f"{playlist_id}:retries",
                    _defer_by=30,
                )
                logger.info(f"[playlist {playlist_id}] Enqueued retry pass for {len(retry_eligible)} video(s)")
            except Exception as e:
                logger.error(f"[playlist {playlist_id}] Failed to enqueue retry pass: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "enqueue_retry_pass")
                    scope.set_tag("playlist_job_id", playlist_id)
                sentry_sdk.capture_exception(e)
        else:
            logger.info(f"[playlist {playlist_id}] Chain complete — no retry-eligible failures")


async def process_playlist_retries(ctx: dict, playlist_id: str) -> None:
    """
    ARQ task: retry bot_detection / timeout failures after a 30s delay.

    Called once at the end of a playlist chain when retryable failures exist.
    Processes eligible videos sequentially (same proxy session as original attempt).
    keep_result=0 — same rationale as process_playlist_video.
    """
    supabase = get_supabase_client()
    log_prefix = f"[playlist {playlist_id}:retries]"

    try:
        row = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
            .select('user_id,video_ids,use_whisper_ids,collection_id,video_results,credits_reserved')
            .eq('id', playlist_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error(f"{log_prefix} Failed to fetch job: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "process_playlist_retries")
            scope.set_tag("playlist_job_id", playlist_id)
        sentry_sdk.capture_exception(e)
        return

    job = row.data
    if not job:
        logger.error(f"{log_prefix} Job not found")
        return

    video_ids: list = job['video_ids']
    user_id: str = job['user_id']
    collection_id: Optional[str] = job.get('collection_id')
    use_whisper_ids: set = set(job.get('use_whisper_ids') or [])
    video_results: dict = job.get('video_results') or {}
    # Reservation-mode uit de PLAYLIST-rij (playlist-niveau reservering).
    reservation_mode: bool = (job.get('credits_reserved') or 0) > 0

    # Heartbeat at start — watchdog detects stale 'retry_pending' jobs (ADR-030 Gap 1 fix).
    # This keeps the heartbeat fresh so watchdog won't re-enqueue a running retry-pass.
    try:
        await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .update({'last_heartbeat_at': datetime.now(timezone.utc).isoformat()})
                .eq('id', playlist_id).execute()
        )
    except Exception as hb_err:
        logger.warning(f"{log_prefix} Start heartbeat failed: {hb_err}")

    async def _set_complete() -> None:
        try:
            await asyncio.to_thread(
                lambda: supabase.table('playlist_extraction_jobs').update({
                    'status': 'complete',
                    'completed_at': datetime.now(timezone.utc).isoformat(),
                }).eq('id', playlist_id).execute()
            )
            # ADR-050 fase 2: retry-pass definitief afgerond -> verreken de reservering één keer
            # (reserved − Σsettlements), idempotent via (playlist_id,'refund').
            if reservation_mode:
                await asyncio.to_thread(refund_credits, None, playlist_id)
        except Exception as e:
            logger.error(f"{log_prefix} Failed to set status=complete: {e}")
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "process_playlist_retries")
                scope.set_tag("playlist_job_id", playlist_id)
            sentry_sdk.capture_exception(e)

    retry_video_ids = [
        v for v, r in video_results.items()
        if r.get('status') == 'error' and r.get('error_type') in ('bot_detection', 'timeout')
    ]

    if not retry_video_ids:
        logger.info(f"{log_prefix} No eligible videos to retry")
        await _set_complete()
        return

    logger.info(f"{log_prefix} Retrying {len(retry_video_ids)} video(s)")

    for video_id in retry_video_ids:
        try:
            orig_index = video_ids.index(video_id)
        except ValueError:
            logger.warning(f"{log_prefix} {video_id} not found in video_ids, skipping")
            continue

        is_whisper = video_id in use_whisper_ids
        is_free = orig_index < 3
        # Retry pass: use a DIFFERENT sticky session than the original attempt
        # (worker.py process_playlist_video) so the retry lands on a fresh Decodo
        # exit IP instead of the same IP that YouTube already rate-limited (429).
        proxy_session = f"{playlist_id[:4]}{orig_index:04d}-retry"

        rpc_success = False
        rpc_transcript_id: Optional[str] = None
        rpc_error_type: Optional[str] = None
        rpc_credit_amount: int = 0

        async def _hb_retry() -> None:
            await asyncio.to_thread(
                lambda: supabase.table('playlist_extraction_jobs')
                    .update({'last_heartbeat_at': datetime.now(timezone.utc).isoformat()})
                    .eq('id', playlist_id).execute()
            )

        try:
            if is_whisper:
                whisper_job_id = str(_uuid.uuid5(_WHISPER_NS, f"{playlist_id}:{video_id}"))

                try:
                    await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs').upsert({
                            'id': whisper_job_id,
                            'user_id': user_id,
                            'status': 'pending',
                            'source_type': 'youtube',
                            'video_url': f'https://www.youtube.com/watch?v={video_id}',
                        }, on_conflict='id', ignore_duplicates=True).execute()
                    )
                except Exception as upsert_err:
                    logger.warning(f"{log_prefix} transcription_jobs upsert failed for {whisper_job_id}: {upsert_err}")

                try:
                    cd_row = await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs')
                            .select('credits_deducted')
                            .eq('id', whisper_job_id).single().execute()
                    )
                    already_deducted = bool(cd_row.data and cd_row.data.get('credits_deducted'))
                except Exception as cd_err:
                    logger.warning(
                        f"{log_prefix} credits_deducted read failed for {whisper_job_id}: {cd_err} "
                        f"— defaulting to already_deducted=True (safe)"
                    )
                    already_deducted = True

                result = await do_assemblyai_transcription(
                    user_id, video_id,
                    job_id=whisper_job_id,
                    collection_id=collection_id,
                    proxy_session_id=proxy_session,
                    deduct_credits_on_success=not already_deducted,
                    reservation_mode=reservation_mode,
                    playlist_id=playlist_id,
                    heartbeat_fn=_hb_retry,
                )
                if result['success']:
                    rpc_success = True
                    rpc_transcript_id = result['transcript_id']
                else:
                    rpc_error_type = result.get('error_type', 'extraction_error')
            else:
                rpc_success, rpc_transcript_id, rpc_error_type, rpc_credit_amount = await _process_caption_video(
                    supabase, user_id, video_id, is_free, collection_id, proxy_session, playlist_id,
                    heartbeat_fn=_hb_retry,
                )

        except MembersOnlyVideoError:
            rpc_error_type = 'members_only'
        except Exception as e:
            rpc_error_type = _classify_download_error(str(e), video_id=video_id, job_id=f"{playlist_id}:retries")
            logger.warning(f"{log_prefix} {video_id} retry failed ({rpc_error_type}): {e}")
            # bot_detection/timeout/members_only/no_captions zijn verwachte operationele uitkomsten, geen bugs.
            if rpc_error_type not in ('bot_detection', 'timeout', 'members_only', 'no_captions'):
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "process_playlist_retries")
                    scope.set_tag("playlist_job_id", playlist_id)
                    scope.set_tag("video_id", video_id)
                    scope.set_tag("error_type", rpc_error_type)
                    scope.set_tag("user_id", user_id)
                sentry_sdk.capture_exception(e)

        await _call_progress_rpc(supabase, playlist_id, video_id, rpc_success, rpc_transcript_id, rpc_error_type,
                                  amount=rpc_credit_amount)

    logger.info(f"{log_prefix} Retry pass complete")
    await _set_complete()


async def watchdog_interrupted_jobs(ctx: dict) -> None:
    """
    ARQ cron: crash-recovery voor interrupted Whisper- en playlist-jobs.
    Draait elke 2 minuten.

    Pass 0 — Reaper (industry-standard dead-job cleanup, ADR-049):
      Sluit transcription_jobs in niet-terminale status die aantoonbaar dood zijn:
        Pass 0a: status='pending', last_heartbeat_at IS NULL, created_at > 30min oud
                 (ARQ miste pickup door Railway-restart of queue-verlies)
        Pass 0b: status IN ('downloading','transcribing','saving'), last_heartbeat_at IS NOT NULL
                 maar stale > 10min (standalone job die gecrashed is)
      NOOIT gereapt: status IN ('downloading','transcribing','saving') met NULL heartbeat —
      dit zijn actieve playlist-video-jobs (hun heartbeat schrijft naar playlist_extraction_jobs).
      credits_deducted=False → status='error' direct.
      credits_deducted=True  → status='interrupted' (Pass 1a hervatten voor re-enqueue).

    Pass 1 — Re-enqueue (watchdog_attempts=0):
      Selecteert transcription_jobs/playlist_extraction_jobs met:
        status='interrupted', credits_deducted=True, geen transcript,
        watchdog_attempts=0, aangemaakt binnen de afgelopen 24u, heartbeat stale.
      Verwijdert arq Redis-keys (Exp 3b, ADR-030) en enqueued opnieuw.
      Increment watchdog_attempts naar 1 en reset status naar 'pending'.

    Pass 2 — Auto-refund (watchdog_attempts>=1, heartbeat stale):
      Als de re-enqueue OOK crashte (heartbeat stale, nog geen transcript),
      trek credits terug binnen ~10 min en markeer als 'error'.
      Alleen transcription_jobs — playlist-credits zijn per-video atomisch via RPC.

    ADR-030 Gap 1 (gecrashte retry-pass): opgelost via status='retry_pending'.
    De RPC zet status='retry_pending' (in plaats van 'complete') wanneer retryable
    failures bestaan. Pass 1b detecteert stale 'retry_pending' + heartbeat en
    re-enqueued process_playlist_retries.
    """
    supabase = get_supabase_client()
    redis = ctx['redis']
    now = datetime.now(timezone.utc)
    stale_before = (now - timedelta(minutes=5)).isoformat()
    cutoff_24h = (now - timedelta(hours=24)).isoformat()

    # ── Pass 0: Reaper — sluit stuck jobs in niet-terminale status ────────
    # Twee strikt gescheiden branches om playlist-video-jobs NOOIT te rapen.
    # Zie ADR-049. Volgorde: Pass 0 vóór Pass 1a zodat credits_deducted=True
    # stuck jobs direct via Pass 1a worden herstart in dezelfde watchdog-cyclus.
    _pending_cutoff = (now - timedelta(minutes=30)).isoformat()
    _active_stale = (now - timedelta(minutes=10)).isoformat()

    # Pass 0a: stuck pending — ARQ heeft de job nooit opgepikt.
    # Playlist-jobs verlaten 'pending' binnen seconden → vallen buiten 30min drempel.
    try:
        _p0a = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('id,credits_deducted')
                .eq('status', 'pending')
                .is_('last_heartbeat_at', 'null')
                .lt('created_at', _pending_cutoff)
                .execute()
        )
        for _job in (_p0a.data or []):
            _jid = _job['id']
            _new_status = 'interrupted' if _job.get('credits_deducted') else 'error'
            try:
                await asyncio.to_thread(
                    lambda j=_jid, s=_new_status: supabase.table('transcription_jobs').update({
                        'status': s,
                        'error_message': 'Watchdog reaper: stuck pending job gesloten (ARQ pickup gemist)',
                        'updated_at': now.isoformat(),
                    }).eq('id', j).execute()
                )
                logger.info(f"[WATCHDOG reaper 0a] {_jid} → {_new_status} (credits_deducted={_job.get('credits_deducted')})")
            except Exception as _e:
                logger.error(f"[WATCHDOG reaper 0a] update failed for {_jid}: {_e}")
    except Exception as _e:
        logger.error(f"[WATCHDOG reaper 0a] query failed: {_e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "0a")
        sentry_sdk.capture_exception(_e)

    # Pass 0b: stuck active — standalone job die gecrashed is tijdens verwerking.
    # IS NOT NULL op last_heartbeat_at sluit playlist-video-jobs uit (hun heartbeat
    # schrijft naar playlist_extraction_jobs, nooit naar transcription_jobs).
    try:
        _p0b = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('id,credits_deducted')
                .in_('status', ['downloading', 'transcribing', 'saving'])
                .not_.is_('last_heartbeat_at', 'null')
                .lt('last_heartbeat_at', _active_stale)
                .execute()
        )
        for _job in (_p0b.data or []):
            _jid = _job['id']
            _new_status = 'interrupted' if _job.get('credits_deducted') else 'error'
            try:
                await asyncio.to_thread(
                    lambda j=_jid, s=_new_status: supabase.table('transcription_jobs').update({
                        'status': s,
                        'error_message': 'Watchdog reaper: stale heartbeat — job gesloten',
                        'updated_at': now.isoformat(),
                    }).eq('id', j).execute()
                )
                logger.info(f"[WATCHDOG reaper 0b] {_jid} → {_new_status} (credits_deducted={_job.get('credits_deducted')})")
            except Exception as _e:
                logger.error(f"[WATCHDOG reaper 0b] update failed for {_jid}: {_e}")
    except Exception as _e:
        logger.error(f"[WATCHDOG reaper 0b] query failed: {_e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "0b")
        sentry_sdk.capture_exception(_e)

    # ── Pass 1a: transcription_jobs re-enqueue ────────────────────────────
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('id,user_id,video_url')
                .eq('status', 'interrupted')
                .eq('credits_deducted', True)
                .is_('transcript_id', 'null')
                .eq('watchdog_attempts', 0)
                .lt('last_heartbeat_at', stale_before)
                .gt('created_at', cutoff_24h)
                .execute()
        )
        for job in (result.data or []):
            job_id = job['id']
            video_url = job.get('video_url') or ''
            # Extract YouTube video ID from stored URL (e.g. https://youtube.com/watch?v=ID)
            _qs = urllib.parse.parse_qs(urllib.parse.urlparse(video_url).query)
            video_id_from_url = (_qs.get('v') or [video_url])[0]
            try:
                await redis.delete(f'arq:job:{job_id}', f'arq:in-progress:{job_id}')
                # CAS-claim: alleen re-enqueuen als DEZE cyclus de rij van attempts=0 -> 1
                # flipt (rowcount==1). Voorkomt dubbele re-enqueue bij overlappende runs.
                claim = await asyncio.to_thread(
                    lambda j=job: supabase.table('transcription_jobs').update({
                        'status': 'pending',
                        'watchdog_attempts': 1,
                        'last_heartbeat_at': None,
                    }).eq('id', j['id']).eq('watchdog_attempts', 0).execute()
                )
                if not claim.data:
                    logger.info(f"[WATCHDOG] job_id={job_id}: al geclaimd door andere cyclus — skip")
                    continue
                await redis.enqueue_job(
                    'run_whisper_job',
                    job_id=job_id,
                    user_id=job['user_id'],
                    video_id=video_id_from_url,
                    _job_id=job_id,
                )
                logger.info(
                    f"[WATCHDOG re-enqueue] job_id={job_id} video_url={video_url} "
                    f"user_id={job['user_id']} attempt=2"
                )
            except Exception as e:
                logger.error(f"[WATCHDOG] re-enqueue failed for {job_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "1a")
                    scope.set_tag("job_id", job_id)
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.error(f"[WATCHDOG] transcription_jobs re-enqueue query failed: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "1a")
        sentry_sdk.capture_exception(e)

    # ── Pass 1b: playlist_extraction_jobs re-enqueue ──────────────────────
    # Handles two cases:
    #   'interrupted'   — mid-chain crash; re-enqueue next video in the chain
    #   'retry_pending' — ADR-030 Gap 1; retry-pass stale → re-enqueue retry-pass
    # Both statuses use the same query (same columns needed) then branch on status.
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .select('id,user_id,video_ids,video_results,completed,failed,total_videos,status,last_heartbeat_at')
                .in_('status', ['interrupted', 'retry_pending'])
                .eq('watchdog_attempts', 0)
                .gt('created_at', cutoff_24h)
                .execute()
        )
        for job in (result.data or []):
            playlist_id = job['id']
            job_status = job['status']
            try:
                # ── Gap 1: crashed retry-pass (status='retry_pending') ────────
                if job_status == 'retry_pending':
                    heartbeat = job.get('last_heartbeat_at')
                    stale = (
                        not heartbeat or
                        datetime.fromisoformat(heartbeat) < datetime.fromisoformat(stale_before)
                    )
                    if not stale:
                        # Retry-pass is still running; heartbeat is fresh.
                        logger.info(f"[WATCHDOG] playlist {playlist_id}: retry-pass running (fresh heartbeat) — skip")
                        continue
                    _job_id = f"{playlist_id}:retries"
                    await redis.delete(f'arq:job:{_job_id}', f'arq:in-progress:{_job_id}')
                    claim = await asyncio.to_thread(
                        lambda pid=playlist_id: supabase.table('playlist_extraction_jobs').update({
                            'watchdog_attempts': 1,
                            'last_heartbeat_at': None,
                        }).eq('id', pid).eq('watchdog_attempts', 0).execute()
                    )
                    if not claim.data:
                        logger.info(f"[WATCHDOG] playlist {playlist_id} retry-pass: al geclaimd — skip")
                        continue
                    await redis.enqueue_job('process_playlist_retries', playlist_id, _job_id=_job_id)
                    logger.info(f"[WATCHDOG re-enqueue] retry-pass {playlist_id} user_id={job['user_id']}")
                    continue

                # ── Interrupted mid-chain video ───────────────────────────────
                # Stale-check is in the query (.lt('last_heartbeat_at', stale_before)) but
                # 'retry_pending' rows skip that filter above. Apply it explicitly here.
                heartbeat = job.get('last_heartbeat_at')
                if heartbeat and datetime.fromisoformat(heartbeat) >= datetime.fromisoformat(stale_before):
                    logger.info(f"[WATCHDOG] playlist {playlist_id}: interrupted but heartbeat fresh — skip")
                    continue

                video_ids = job.get('video_ids') or []
                video_results = job.get('video_results') or {}
                completed = job.get('completed', 0)
                failed = job.get('failed', 0)
                total = job.get('total_videos', len(video_ids))

                if completed + failed >= total > 0:
                    # All videos done but status='interrupted' — defensive; should not happen
                    # now that retry_pending covers the Gap 1 case. Skip to avoid confusion.
                    logger.info(f"[WATCHDOG] playlist {playlist_id}: all videos done, status=interrupted — skip")
                    continue

                # Eerste video zonder resultaat is de te hervatten video_index.
                video_index = next(
                    (idx for idx, vid in enumerate(video_ids) if vid not in video_results),
                    None,
                )
                if video_index is None:
                    logger.info(f"[WATCHDOG] playlist {playlist_id}: geen openstaande video gevonden — skip")
                    continue

                _job_id = f"{playlist_id}:{video_index}"
                await redis.delete(f'arq:job:{_job_id}', f'arq:in-progress:{_job_id}')
                claim = await asyncio.to_thread(
                    lambda pid=playlist_id: supabase.table('playlist_extraction_jobs').update({
                        'status': 'running',
                        'watchdog_attempts': 1,
                        'last_heartbeat_at': None,
                    }).eq('id', pid).eq('watchdog_attempts', 0).execute()
                )
                if not claim.data:
                    logger.info(f"[WATCHDOG] playlist {playlist_id}: al geclaimd door andere cyclus — skip")
                    continue
                await redis.enqueue_job(
                    'process_playlist_video',
                    playlist_id,
                    video_index,
                    _job_id=_job_id,
                )
                logger.info(
                    f"[WATCHDOG re-enqueue] playlist {playlist_id} video_index={video_index} "
                    f"user_id={job['user_id']} attempt=2"
                )
            except Exception as e:
                logger.error(f"[WATCHDOG] playlist re-enqueue failed for {playlist_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "1b")
                    scope.set_tag("job_id", playlist_id)
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.error(f"[WATCHDOG] playlist_extraction_jobs re-enqueue query failed: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "1b")
        sentry_sdk.capture_exception(e)

    # ── Pass 2: auto-refund — heartbeat stale na re-enqueue ──────────────
    # Selecteert transcription_jobs met watchdog_attempts>=1 en heartbeat stale.
    # Scenario: Pass 1 re-enqueued, maar ook de tweede poging crashte — job staat
    # nog 'interrupted' en heeft >5 min geen heartbeat meer gekregen.
    # Refund binnen ~10 min na mislukte re-enqueue (geen 24u-wacht).
    # Vangt zowel oude-modus (credits_deducted) als gereserveerde jobs (credits_reserved>0).
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .select('id,user_id,credits_cost,credits_reserved')
                .eq('status', 'interrupted')
                .is_('transcript_id', 'null')
                .gte('watchdog_attempts', 1)
                .lt('last_heartbeat_at', stale_before)
                .or_('credits_deducted.eq.true,credits_reserved.gt.0')
                .execute()
        )
        for job in (result.data or []):
            job_id = job['id']
            refund_amount = job.get('credits_cost') or 0
            try:
                # CAS-claim: alleen refunden als DEZE cyclus de rij van 'interrupted' -> 'error'
                # flipt (rowcount==1). Postgres serialiseert de row-lock, dus bij overlappende
                # watchdog-runs matcht de tweede UPDATE 0 rijen -> geen dubbele terugstorting.
                claim = await asyncio.to_thread(
                    lambda j=job: supabase.table('transcription_jobs').update({
                        'status': 'error',
                        'error_type': 'watchdog_permanent_failure',
                        'error_message': 'Automatisch teruggestort na mislukte crash-recovery.',
                    }).eq('id', j['id']).eq('status', 'interrupted').execute()
                )
                if not claim.data:
                    logger.info(f"[WATCHDOG refund] job_id={job_id}: al verwerkt door andere cyclus — skip")
                    continue
                if (job.get('credits_reserved') or 0) > 0:
                    # Gereserveerde job: verreken de reservering (reserved − Σsettlements),
                    # idempotent via (job_id,'refund'). run_whisper_job deed dit normaal al;
                    # dit vangt de crash vóór die refund-call.
                    await asyncio.to_thread(refund_credits, job_id, None)
                    logger.info(f"[WATCHDOG refund] reserved job_id={job_id} -> refund_credits")
                elif refund_amount > 0:
                    await asyncio.to_thread(
                        lambda uid=job['user_id'], amt=refund_amount, jid=job_id:
                            add_credits(uid, amt, f"Refund: watchdog crash-recovery (job {jid})")
                    )
                    logger.info(
                        f"[WATCHDOG refund] job_id={job_id} user_id={job['user_id']} "
                        f"refund={refund_amount}cr"
                    )
                else:
                    logger.info(
                        f"[WATCHDOG refund] job_id={job_id}: credits_cost=0 of onbekend — geen aftrek"
                    )
            except Exception as e:
                logger.error(f"[WATCHDOG] auto-refund failed for {job_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "2")
                    scope.set_tag("job_id", job_id)
                    scope.set_tag("user_id", job.get("user_id", "unknown"))
                    scope.set_extra("refund_amount", refund_amount)
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.error(f"[WATCHDOG] auto-refund query failed: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2")
        sentry_sdk.capture_exception(e)

    # ── Pass 2b: playlist auto-refund — gecrashte GERESERVEERDE playlist ─────
    # Een playlist die NA re-enqueue (Pass 1b, watchdog_attempts>=1) opnieuw stale
    # 'interrupted' raakt = permanent mislukt. Verreken de reservering éénmalig
    # (reserved − Σsettlements) via refund_credits. TERMINAL-only: attempts>=1 vereist,
    # zodat een transient-geïnterrumpeerde-maar-hervattende playlist (attempts=0, Pass 1b)
    # NIET vroegtijdig refundt (ADR-050 fase 2). Idempotent via (playlist_id,'refund');
    # de status-flip (CAS) stopt her-selectie in volgende cycli.
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .select('id,user_id')
                .eq('status', 'interrupted')
                .gte('watchdog_attempts', 1)
                .lt('last_heartbeat_at', stale_before)
                .gt('credits_reserved', 0)
                .execute()
        )
        for job in (result.data or []):
            playlist_id = job['id']
            try:
                claim = await asyncio.to_thread(
                    lambda j=job: supabase.table('playlist_extraction_jobs').update({
                        'status': 'error',
                        'completed_at': datetime.now(timezone.utc).isoformat(),
                    }).eq('id', j['id']).eq('status', 'interrupted').execute()
                )
                if not claim.data:
                    logger.info(f"[WATCHDOG refund] playlist {playlist_id}: al verwerkt — skip")
                    continue
                await asyncio.to_thread(refund_credits, None, playlist_id)
                logger.info(f"[WATCHDOG refund] playlist {playlist_id} -> refund_credits (reserved − settled)")
            except Exception as e:
                logger.error(f"[WATCHDOG] playlist auto-refund failed for {playlist_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "2b")
                    scope.set_tag("job_id", playlist_id)
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.error(f"[WATCHDOG] playlist auto-refund query failed: {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2b")
        sentry_sdk.capture_exception(e)


async def noop_task(ctx: dict) -> str:
    """Fase 1 stub — verifies the worker picks up jobs from the queue."""
    return "ok"


class WorkerSettings:
    functions = [
        noop_task,
        run_whisper_job,
        arq_func(process_playlist_video, keep_result=0),
        arq_func(process_playlist_retries, keep_result=0),
        watchdog_interrupted_jobs,
    ]
    cron_jobs = [
        # Elke 2 minuten: detecteer crashed jobs en start crash-recovery.
        cron(watchdog_interrupted_jobs, minute=set(range(0, 60, 2))),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("ARQ_REDIS_URL") or "redis://localhost:6379"
    )
    keep_result = 3600  # default for run_whisper_job / noop_task
    # job_timeout: verhoogd van default 300s naar 7200s (2 uur).
    # Reden: Whisper-jobs voor lange video's (bijv. 4-uur lecture) duren ~30 min;
    # playlist-jobs met 100+ videos duren meerdere uren.
    # Default 300s zou deze jobs halverwege killen.
    job_timeout = 7200
    # NOTE — ack_late bestaat NIET in arq 0.28.0 (ook niet in eerdere versies).
    # Het is een Celery-concept; arq heeft geen equivalente parameter.
    # Jobs worden in arq altijd geacknowledged bij pickup (geen retry bij worker-crash).
    # De idempotency-vlaggen (credits_deducted, v_already_done) zijn live maar beschermen
    # alleen bij handmatige herstart, niet bij automatische retry.
    # Crash-recovery verloopt via watchdog_interrupted_jobs (zie boven).

