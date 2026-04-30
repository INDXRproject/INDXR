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
import uuid as _uuid
from datetime import datetime, timezone
from typing import Optional

import posthog
import sentry_sdk
from arq import func as arq_func
from arq.connections import RedisSettings
from dotenv import load_dotenv

from audio_utils import MembersOnlyVideoError
from credit_manager import (
    check_user_balance,
    get_supabase_client,
)
from transcription_pipeline import (
    _classify_download_error,
    _run_with_heartbeat,
    do_assemblyai_transcription,
)
from master_cache import master_transcripts_write
from youtube_client import YouTubeClient
from youtube_utils import extract_via_youtube_transcript_api, extract_with_ytdlp

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
                .select('credits_deducted')
                .eq('id', job_id).single().execute()
        )
        already_deducted = bool(row.data and row.data.get('credits_deducted'))
    except Exception as e:
        logger.warning(
            f"[run_whisper_job] credits_deducted read failed for {job_id}: {e} "
            f"— defaulting to already_deducted=True (safe)"
        )
        already_deducted = True

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
        heartbeat_fn=_hb,
    )
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

    # Cascade step 1: youtube-transcript-api (faster, no yt-dlp overhead)
    extract_result = await extract_via_youtube_transcript_api(video_id, session_id=proxy_session)
    caption_model = "youtube_transcript_api"

    # ── Cascade step 1 metadata enrichment via YouTube Data API ──────────────
    if extract_result is not None:
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
                extract_with_ytdlp(video_id, use_proxy=True, session_id=proxy_session),
                heartbeat_fn,
            )
            caption_model = "youtube_captions"
        except MembersOnlyVideoError:
            raise  # structural — step 3 cannot help
        except Exception as step2_err:
            # ── Cascade step 3: yt-dlp (tv/android client rotation) ──────
            logger.info(f"[CASCADE] {video_id}: step 2 failed ({type(step2_err).__name__}), trying step 3 (tv/android)")
            extract_result = await _run_with_heartbeat(
                extract_with_ytdlp(video_id, use_proxy=True, session_id=proxy_session, clients=['tv', 'android']),
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
    lang = extract_result.get('language') or 'en'
    asyncio.create_task(master_transcripts_write(
        video_id=video_id,
        language=lang,
        model=caption_model,
        transcript_data=transcript,
        duration_seconds=duration,
        source_method='caption_extraction',
    ))

    # Credit-deductie is verplaatst naar de update_playlist_video_progress RPC (M3).
    # Atomisch + idempotent via v_already_done — geen dubbele aftrek bij worker-restart.
    credit_amount = 0 if is_free else 1
    return True, transcript_id, None, credit_amount


async def _call_progress_rpc(supabase, playlist_id: str, video_id: str, success: bool,
                              transcript_id: Optional[str] = None, error_type: Optional[str] = None,
                              amount: int = 0) -> None:
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
        await asyncio.to_thread(
            lambda: supabase.rpc('update_playlist_video_progress', params).execute()
        )
    except Exception as e:
        logger.error(f"[playlist {playlist_id}] RPC update failed for {video_id}: {e}")


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
            .select('user_id,video_ids,use_whisper_ids,collection_id,total_videos,video_results')
            .eq('id', playlist_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error(f"{log_prefix} Failed to fetch job: {e}")
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

    await _call_progress_rpc(supabase, playlist_id, video_id, rpc_success, rpc_transcript_id, rpc_error_type,
                              amount=rpc_credit_amount)

    # Build final video_results for the last-video retry check
    final_video_results = {**video_results}
    if rpc_success:
        final_video_results[video_id] = {'status': 'success', 'transcript_id': rpc_transcript_id}
    else:
        final_video_results[video_id] = {'status': 'error', 'error_type': rpc_error_type}

    await _enqueue_next(ctx, playlist_id, video_index, total_videos, final_video_results)


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
            .select('user_id,video_ids,use_whisper_ids,collection_id,video_results')
            .eq('id', playlist_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error(f"{log_prefix} Failed to fetch job: {e}")
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

    retry_video_ids = [
        v for v, r in video_results.items()
        if r.get('status') == 'error' and r.get('error_type') in ('bot_detection', 'timeout')
    ]

    if not retry_video_ids:
        logger.info(f"{log_prefix} No eligible videos to retry")
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
        proxy_session = f"{playlist_id[:4]}{orig_index:04d}"

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

        await _call_progress_rpc(supabase, playlist_id, video_id, rpc_success, rpc_transcript_id, rpc_error_type,
                                  amount=rpc_credit_amount)

    logger.info(f"{log_prefix} Retry pass complete")


async def noop_task(ctx: dict) -> str:
    """Fase 1 stub — verifies the worker picks up jobs from the queue."""
    return "ok"


class WorkerSettings:
    functions = [
        noop_task,
        run_whisper_job,
        arq_func(process_playlist_video, keep_result=0),
        arq_func(process_playlist_retries, keep_result=0),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("UPSTASH_REDIS_URL") or "redis://localhost:6379"
    )
    keep_result = 3600  # default for run_whisper_job / noop_task
    # ack_late=False (default): no automatic retry on worker crash.
    # Upgrade to ack_late=True in Fase 4 after idempotency keys prevent double credit deduction.
