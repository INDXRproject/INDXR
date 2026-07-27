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
from datetime import datetime, timedelta, timezone, date
from typing import Optional

import posthog
import sentry_sdk
from arq import cron, func as arq_func
from arq.connections import RedisSettings
from dotenv import load_dotenv

from audio_utils import MembersOnlyVideoError
from credit_manager import (
    check_user_balance,
    refund_credits,
    refund_credits_flat,
    get_supabase_client,
    playlist_free_ids,
)
from transcription_pipeline import (
    _classify_download_error,
    _run_with_heartbeat,
    CAPTION_EXTRACT_TIMEOUT,
    TRANSCRIPTION_JOB_TIMEOUT_SECONDS,
    do_assemblyai_transcription,
    run_whisper_reservation_aware,
    refund_with_retry,
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

from sentry_scrub import sentry_scrub
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_BACKEND"),
    traces_sample_rate=0.1,
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
    send_default_pii=False,   # never attach user IP / cookies / body by default
    before_send=sentry_scrub, # scrub email/IP/auth-headers/body before send (errors stay)
)

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
# EU host with an explicit EU-fallback — a missing env must never fall back to the SDK's US default.
posthog.host = os.getenv("POSTHOG_HOST", "https://eu.i.posthog.com")
posthog.disable_geoip = True  # no IP-based geo enrichment on server-side events


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

    async def _hb() -> None:
        await asyncio.to_thread(
            lambda: supabase.table('transcription_jobs')
                .update({'last_heartbeat_at': datetime.now(timezone.utc).isoformat()})
                .eq('id', job_id).execute()
        )

    # Reservation-aware dispatch (ADR-050 fase 2): de gedeelde wrapper leest credits_deducted +
    # credits_reserved van de eigen job-rij, skipt de oude aftrek in reservation-mode + settelt,
    # en verrekent de reservering ná afloop (refund op success én failure, idempotent via
    # (job_id,'refund')). Zelfde primitief als het upload-pad en de youtube-fallback (main.py)
    # — één bedrading, geen drift. Fail-safe (read-fout) zit in de wrapper.
    result = await run_whisper_reservation_aware(
        user_id,
        video_id,
        job_id=job_id,
        audio_title=title,
        proxy_session_id=job_id[:8],
        heartbeat_fn=_hb,
    )
    if result['success']:
        logger.info(f"← run_whisper_job ● (transcript_id={result['transcript_id']}, {result['credit_cost']}cr)")
    else:
        logger.warning(f"← run_whisper_job ✗ (error_type={result.get('error_type')})")


async def _log_caption_event(user_id: str, video_id: str, proxy_bytes: int, cache_hit: bool,
                             credits_used: int = 0, success: bool = True) -> None:
    """BLOK A: per-caption event-rij voor de PLAYLIST-route (altijd ingelogd). credits_used=1 voor
    betaalde video's, 0 voor gratis (eerste 3) → gratis = free-funnel-OPEX, betaald = echte caption-COR.
    De RPC snapshot't had_paid + is_internal server-side. Nooit blokkerend (best-effort).
    B3: bron altijd 'playlist' (deze helper is exclusief de playlist-route)."""
    try:
        await asyncio.to_thread(
            lambda: get_supabase_client().rpc('log_caption_usage', {
                'p_user_id': user_id,
                'p_video_id': video_id,
                'p_proxy_bytes': int(proxy_bytes or 0),
                'p_cache_hit': bool(cache_hit),
                'p_credits_used': int(credits_used or 0),
                'p_success': bool(success),
                'p_source': 'playlist',
            }).execute()
        )
    except Exception as e:
        logger.warning(f"[caption-usage] playlist log failed for {video_id}: {e}")


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
            # BLOK A: cache-hit → 0 egress, per-user rij (credits_used onderscheidt gratis/betaald).
            await _log_caption_event(user_id, video_id, 0, cache_hit=True, credits_used=credit_amount)
            return True, transcript_id, None, credit_amount

    # Cascade step 1: youtube-transcript-api (faster, no yt-dlp overhead).
    # Timeout-gewrapt zodat een hangende step-1-fetch de keten niet blokkeert; een timeout hier
    # valt door naar step 2/3 (net als een normale step-1-miss), niet naar een harde fout.
    try:
        extract_result = await _run_with_heartbeat(
            extract_via_youtube_transcript_api(video_id, session_id=proxy_session, lang_pref=normalised_lang),
            heartbeat_fn,
            timeout=CAPTION_EXTRACT_TIMEOUT,
        )
    except Exception as step1_err:
        logger.info(f"[CASCADE] {video_id}: step 1 timed out/failed ({type(step1_err).__name__}), trying step 2")
        extract_result = None
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
                timeout=CAPTION_EXTRACT_TIMEOUT,
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
                timeout=CAPTION_EXTRACT_TIMEOUT,
            )
            caption_model = "youtube_captions_rotated"

    if not isinstance(extract_result, dict) or 'transcript' not in extract_result:
        # BLOK A: mislukte playlist-caption (ingelogd) — bytes onbekend hier, log 0/success=false.
        await _log_caption_event(user_id, video_id, 0, cache_hit=False,
                                 credits_used=(0 if is_free else 1), success=False)
        return False, None, 'no_captions', 0

    # Decodo egress van de cache-MISS playlist-caption (step 1: video page + timedtext; step 2/3: yt-dlp VTT).
    # BLOK A/D: playlist-captions zijn ALTIJD ingelogd → per-user usage_logs-rij, NIET daily_cost_counters.
    # credits_used=1 (betaald) → echte caption-COR; 0 (gratis eerste 3) → free-funnel-OPEX. Cache-hit
    # retourneert eerder → geen egress → geen dubbeltelling.
    _cap_bytes = extract_result.get('proxy_bytes') or 0
    await _log_caption_event(user_id, video_id, _cap_bytes, cache_hit=False,
                             credits_used=(0 if is_free else 1), success=True)

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

    # Best-effort master cache write (fire-and-forget, never blocks user flow).
    # force_refresh=True → UPSERT: self-heals a stale/wrong-content row and lets the
    # 90-day caption refresh actually update fetched_from_provider_at (insert-only
    # would 409 and leave a bad row immortal). Matches the single-video path in main.py.
    lang = normalize_language_code(extract_result.get('language')) or 'en'
    asyncio.create_task(master_transcripts_write(
        video_id=video_id,
        language=lang,
        model=caption_model,
        transcript_data=transcript,
        duration_seconds=duration,
        source_method='caption_extraction',
        force_refresh=True,
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
            .select('user_id,video_ids,use_whisper_ids,collection_id,total_videos,video_results,credits_reserved,is_retry')
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
    # Retry-job: gratis-3 is al in de originele run verbruikt -> geen gratis-tier hier.
    is_retry: bool = bool(job.get('is_retry'))

    if video_index >= len(video_ids):
        logger.error(f"{log_prefix} video_index out of bounds (total={len(video_ids)})")
        return

    video_id = video_ids[video_index]
    is_whisper = video_id in use_whisper_ids
    # Gedeelde regel-bron (identiek aan reservering + retry-pass) — geen inline-kopie meer.
    is_free = video_id in playlist_free_ids(video_ids, use_whisper_ids, is_retry)

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
                        # B3: playlist-whisper job → bron-vlag + playlist-verwijzing bij aanmaak.
                        'source_kind': 'playlist',
                        'playlist_id': playlist_id,
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
        if rpc_error_type not in ('bot_detection', 'timeout', 'connection_error', 'server_error', 'members_only', 'no_captions'):
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
    # er gereserveerd -> verreken één keer (reserved − Σsettlements). Bounded idempotente retry:
    # de playlist is nu status='complete' → buiten Pass 2b, dus een gefaalde refund heeft géén
    # ander vangnet dan de Pass 2c-reconciliatie. Bij should_retry gebeurt de refund pas ná de
    # retry-pass.
    if reservation_mode and rpc_result and rpc_result.get('playlist_complete') and not rpc_result.get('should_retry'):
        await refund_with_retry(None, playlist_id, context="playlist-complete")


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
            if r.get('status') == 'error' and r.get('error_type') in ('bot_detection', 'timeout', 'connection_error', 'server_error')
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
            .select('user_id,video_ids,use_whisper_ids,collection_id,video_results,credits_reserved,is_retry')
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
    # Retry-job: gratis-3 is al in de originele run verbruikt -> geen gratis-tier hier.
    is_retry: bool = bool(job.get('is_retry'))

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
            # (reserved − Σsettlements). Bounded idempotente retry: status is nu 'complete' →
            # buiten Pass 2b, dus geen ander vangnet dan de Pass 2c-reconciliatie.
            if reservation_mode:
                await refund_with_retry(None, playlist_id, context="playlist-retry-complete")
        except Exception as e:
            logger.error(f"{log_prefix} Failed to set status=complete: {e}")
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "process_playlist_retries")
                scope.set_tag("playlist_job_id", playlist_id)
            sentry_sdk.capture_exception(e)

    retry_video_ids = [
        v for v, r in video_results.items()
        if r.get('status') == 'error' and r.get('error_type') in ('bot_detection', 'timeout', 'connection_error', 'server_error')
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
        # Gedeelde regel-bron (identiek aan reservering + hoofd-pass).
        is_free = video_id in playlist_free_ids(video_ids, use_whisper_ids, is_retry)
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
                            # B3: playlist-whisper (retry-pad) → bron-vlag + playlist-verwijzing bij aanmaak.
                            'source_kind': 'playlist',
                            'playlist_id': playlist_id,
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
            if rpc_error_type not in ('bot_detection', 'timeout', 'connection_error', 'server_error', 'members_only', 'no_captions'):
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


async def _refund_then_claim_job(supabase, job) -> None:
    """Pass 2 per-job (ADR-050 crash-recovery): refund EERST (idempotent), claim de status pas
    terminal ('interrupted' -> 'error') bij een BEWEZEN-geboekte refund. Faalt de refund (bv. 522)
    -> status blijft 'interrupted' zodat de volgende 2-min-cyclus 'm opnieuw selecteert en retry't,
    plus error-Sentry (refund_failed=true). Dit draait de faalmodus om van 'stil geld kwijt' naar
    'veilige retry'. Dubbel-refund is uitgesloten door de (job_id,'refund')-idempotentie; de CAS
    (WHERE status='interrupted') voorkomt dubbele status-churn bij overlappende cycli."""
    job_id = job['id']
    reserved = (job.get('credits_reserved') or 0) > 0
    refund_amount = job.get('credits_cost') or 0

    # 1. Refund eerst — idempotent via de partiële UNIQUE (job_id,'refund').
    if reserved:
        r = await asyncio.to_thread(refund_credits, job_id, None)
    elif refund_amount > 0:
        r = await asyncio.to_thread(
            refund_credits_flat, job['user_id'], job_id, refund_amount,
            f"Refund: watchdog crash-recovery (job {job_id})"
        )
    else:
        r = {'success': True, 'noop': True}  # niets te refunden (credits_cost=0, niet gereserveerd)

    # 2. Returnwaarde checken — een GEFAALDE refund mag de status NIET terminal maken.
    if not (r and r.get('success')):
        logger.error(
            f"[WATCHDOG refund] job_id={job_id}: refund FAILED, status blijft 'interrupted' "
            f"-> retry volgende cyclus: {r}"
        )
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2")
            scope.set_tag("refund_failed", "true")
            scope.set_tag("job_id", job_id)
            scope.set_tag("user_id", str(job.get('user_id', 'unknown')))
            scope.set_extra("refund_result", r)
        sentry_sdk.capture_message(
            "Watchdog auto-refund failed (job left interrupted for retry)", level="error"
        )
        return

    # 3. Refund geboekt -> terminal claimen (CAS). rows==0 = andere cyclus was eerder.
    claim = await asyncio.to_thread(
        lambda: supabase.table('transcription_jobs').update({
            'status': 'error',
            'error_type': 'watchdog_permanent_failure',
            'error_message': 'Automatisch teruggestort na mislukte crash-recovery.',
        }).eq('id', job_id).eq('status', 'interrupted').execute()
    )
    if not claim.data:
        logger.info(f"[WATCHDOG refund] job_id={job_id}: al verwerkt door andere cyclus — skip")
    else:
        logger.info(
            f"[WATCHDOG refund] job_id={job_id} -> refund geboekt + status=error "
            f"({'reserved' if reserved else str(refund_amount) + 'cr'})"
        )


async def _refund_then_claim_playlist(supabase, job) -> None:
    """Pass 2b per-job: refund EERST (idempotent via (playlist_id,'refund')), claim de playlist
    pas terminal bij bewezen-geboekte refund. Zelfde faalmodus-omkering als Pass 2."""
    playlist_id = job['id']
    r = await asyncio.to_thread(refund_credits, None, playlist_id)
    if not (r and r.get('success')):
        logger.error(
            f"[WATCHDOG refund] playlist {playlist_id}: refund FAILED, status blijft 'interrupted' "
            f"-> retry volgende cyclus: {r}"
        )
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2b")
            scope.set_tag("refund_failed", "true")
            scope.set_tag("job_id", playlist_id)
            scope.set_tag("user_id", str(job.get('user_id', 'unknown')))
            scope.set_extra("refund_result", r)
        sentry_sdk.capture_message(
            "Watchdog playlist auto-refund failed (playlist left interrupted for retry)", level="error"
        )
        return

    claim = await asyncio.to_thread(
        lambda: supabase.table('playlist_extraction_jobs').update({
            'status': 'error',
            'completed_at': datetime.now(timezone.utc).isoformat(),
        }).eq('id', playlist_id).eq('status', 'interrupted').execute()
    )
    if not claim.data:
        logger.info(f"[WATCHDOG refund] playlist {playlist_id}: al verwerkt — skip")
    else:
        logger.info(f"[WATCHDOG refund] playlist {playlist_id} -> refund geboekt + status=error")


async def _reconcile_unrefunded_reserved(supabase, limit: int = 50) -> None:
    """Watchdog Pass 2c — reconciliatie-vangnet (ADR-050). Vindt via de anti-join
    (`watchdog_unrefunded_reserved`) TERMINALE jobs/playlists (status complete/error) met
    credits_reserved>0 en GEEN refund-rij: dat zijn refunds die zowel de bounded-retry ÁLS een
    worker-crash misten (buiten Pass 2/2b want al terminaal). Boekt de ontbrekende refund via
    `refund_credits` (idempotent via (job_id/playlist_id,'refund')).

    MUTEERT BEWUST GEEN STATUS. Anders dan Pass 2/2b (die 'interrupted'→'error' claimen als
    onderdeel van crash-afhandeling) is een Pass 2c-job al terminaal én correct afgehandeld —
    alleen de geld-boeking ontbreekt. Er valt dus niets te claimen; de anti-join zelf is de
    idempotentie (zodra de refund-rij bestaat verdwijnt de job uit de selectie). Een hit betekent
    dat een eerdere terminale refund gemist is (retry ÉN crash faalden) → error-level Sentry, want
    dat is een structureel signaal, geen routine. `limit` capt de rijen/cyclus (drainen over
    meerdere 2-min-cycli bij achterstand)."""
    try:
        rows = await asyncio.to_thread(
            lambda: supabase.rpc('watchdog_unrefunded_reserved', {'p_limit': limit}).execute()
        )
    except Exception as e:
        logger.warning(f"[WATCHDOG reconcile 2c] query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2c")
            scope.set_level("warning")
        sentry_sdk.capture_exception(e)
        return

    for row in (rows.data or []):
        entity = row.get('entity')
        ref_id = row.get('ref_id')
        try:
            if entity == 'job':
                r = await asyncio.to_thread(refund_credits, ref_id, None)
            else:
                r = await asyncio.to_thread(refund_credits, None, ref_id)
            ok = bool(r and r.get('success'))
            logger.error(
                f"[WATCHDOG reconcile 2c] gemiste terminale refund voor {entity} {ref_id} "
                f"-> refund_credits {'geboekt' if ok else 'FAALDE'}: {r}"
            )
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "watchdog_interrupted_jobs")
                scope.set_tag("pass", "2c")
                scope.set_tag("refund_context", "pass-2c-reconciliation")
                scope.set_tag("ref_id", str(ref_id))
                scope.set_tag("refund_failed", "false" if ok else "true")
                scope.set_extra("refund_result", r)
            sentry_sdk.capture_message(
                f"Pass 2c reconciliation booked a missed terminal refund ({entity})"
                if ok else f"Pass 2c reconciliation refund FAILED, retry next cycle ({entity})",
                level="error",
            )
        except Exception as e:
            logger.error(f"[WATCHDOG reconcile 2c] refund raised for {entity} {ref_id}: {e}")
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "watchdog_interrupted_jobs")
                scope.set_tag("pass", "2c")
                scope.set_tag("ref_id", str(ref_id))
            sentry_sdk.capture_exception(e)


# ── Stuck-running-playlist reap (stuck-playlist fix) ─────────────────────────────
REAP_PROGRESS_STALE_MIN = 25   # geen video voltooid in 25min (of nooit voortgang & ouder dan 25min)
REAP_HEARTBEAT_STALE_MIN = 5   # geen levende worker: heartbeat NULL of ouder dan 5min

# Pass 1b re-enqueue is niet meer one-shot: een transient-geïnterrumpeerde playlist krijgt tot 3
# herstelpogingen (met de per-video-timeout uit Fix 1 hangen retries niet meer). Bij uitputting
# refundt Pass 2b (interrupted + attempts>=1 + stale) of reapt Pass 3 (stuck 'running').
MAX_PLAYLIST_WATCHDOG_ATTEMPTS = 3


def _should_reap_running_playlist(job: dict, now: datetime) -> bool:
    """Pure predikaat voor de stale-'running'-playlist reap (Fix 2). BEIDE condities moeten gelden:

      (1) VOORTGANG stale: COALESCE(last_progress_at, created_at) ouder dan 25min. last_progress_at
          wordt per video door de RPC update_playlist_video_progress gezet; de created_at-fallback
          vangt de never-progressed zombie (progress NULL, created oud). Een vers-gestarte playlist
          (recente created_at, NULL progress) is NIET stale → wordt NOOIT gereapt.
      (2) HEARTBEAT stale: last_heartbeat_at NULL of ouder dan 5min. Dit is een PROTECTIEVE guard,
          geen trigger: een legitiem trage whisper-video tikt elke 60s heartbeat → progress oud maar
          heartbeat vers → NIET gereapt. Combined met de per-video-timeout (Fix 1, elke healthy worker
          tikt <2min) betekent een heartbeat ≥5min stale een DODE worker → geen latere settlement →
          geen money-loss-window bij de refund-vóór-claim.
    """
    prog_raw = job.get('last_progress_at') or job.get('created_at')
    if not prog_raw:
        return False  # geen tijdsreferentie — defensief niet rapen
    try:
        prog = datetime.fromisoformat(prog_raw)
    except (ValueError, TypeError):
        return False
    if prog >= now - timedelta(minutes=REAP_PROGRESS_STALE_MIN):
        return False  # recente voortgang (of net gestart) → gezond

    hb_raw = job.get('last_heartbeat_at')
    if hb_raw:
        try:
            hb = datetime.fromisoformat(hb_raw)
        except (ValueError, TypeError):
            hb = None
        if hb is not None and hb >= now - timedelta(minutes=REAP_HEARTBEAT_STALE_MIN):
            return False  # verse heartbeat → levende worker (trage video) → niet rapen
    return True


async def _reap_stale_running_playlist(supabase, job: dict) -> None:
    """Fix 2: refund + terminale-claim voor een vastgelopen 'running' playlist. REFUND-VÓÓR-CLAIM
    (zelfde faalmodus-omkering als Pass 2b), idempotent via (playlist_id,'refund') + CAS op
    status='running' (dubbel-reap-guard). Markeert onverwerkte video's als 'timeout' (retryable via de
    bestaande Retry-all UX) en zet status='complete' → frontend toont Final Summary + retry-knoppen.
    NIET auto-re-enqueuen (voorkomt oneindige hang-loop; de gebruiker retryt zelf)."""
    playlist_id = job['id']
    reserved = job.get('credits_reserved') or 0

    # 1. Refund EERST (alleen als er gereserveerd is — pre-ADR-050 zombies hebben reserved 0/NULL →
    #    skip refund, alleen terminaal markeren). Idempotent via (playlist_id,'refund'). Faalt →
    #    status blijft 'running' → volgende cyclus retry't (zoals _refund_then_claim_playlist).
    if reserved > 0:
        r = await asyncio.to_thread(refund_credits, None, playlist_id)
        if not (r and r.get('success')):
            logger.error(
                f"[WATCHDOG reap] playlist {playlist_id}: refund FAILED, blijft 'running' "
                f"-> retry volgende cyclus: {r}"
            )
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("task_name", "watchdog_interrupted_jobs")
                scope.set_tag("pass", "reap-running")
                scope.set_tag("refund_failed", "true")
                scope.set_tag("job_id", playlist_id)
                scope.set_tag("user_id", str(job.get('user_id', 'unknown')))
                scope.set_extra("refund_result", r)
            sentry_sdk.capture_message(
                "Watchdog reap: stale-running playlist refund failed (left running for retry)",
                level="error",
            )
            return

    # 2. Markeer onverwerkte video's als getimede-out (retryable via Retry-all) + herbereken failed.
    video_ids = job.get('video_ids') or []
    vr = dict(job.get('video_results') or {})
    newly_failed = 0
    for vid in video_ids:
        if vid not in vr:
            vr[vid] = {'status': 'error', 'error_type': 'timeout'}
            newly_failed += 1
    new_failed = (job.get('failed') or 0) + newly_failed

    # 3. CAS-claim terminal: alleen als nog steeds 'running' → idempotent + dubbel-reap + race-guard.
    claim = await asyncio.to_thread(
        lambda: supabase.table('playlist_extraction_jobs').update({
            'status': 'complete',
            'video_results': vr,
            'failed': new_failed,
            'completed_at': datetime.now(timezone.utc).isoformat(),
        }).eq('id', playlist_id).eq('status', 'running').execute()
    )
    if not claim.data:
        logger.info(f"[WATCHDOG reap] playlist {playlist_id}: al verwerkt/gewijzigd — skip")
    else:
        logger.warning(
            f"[WATCHDOG reap] playlist {playlist_id} -> reserved={reserved} "
            f"(refunded indien >0), {newly_failed} video's timeout, status=complete"
        )


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
                        'error_type': 'stuck_pending' if s == 'error' else None,
                        'error_message': 'Watchdog reaper: stuck pending job gesloten (ARQ pickup gemist)',
                        'updated_at': now.isoformat(),
                    }).eq('id', j).execute()
                )
                logger.info(f"[WATCHDOG reaper 0a] {_jid} → {_new_status} (credits_deducted={_job.get('credits_deducted')})")
            except Exception as _e:
                logger.error(f"[WATCHDOG reaper 0a] update failed for {_jid}: {_e}")
    except Exception as _e:
        logger.warning(f"[WATCHDOG reaper 0a] query failed (transient, retry in 2min): {_e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "0a")
            scope.set_level("warning")
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
                        'error_type': 'worker_crashed' if s == 'error' else None,
                        'error_message': 'Watchdog reaper: stale heartbeat — job gesloten',
                        'updated_at': now.isoformat(),
                    }).eq('id', j).execute()
                )
                logger.info(f"[WATCHDOG reaper 0b] {_jid} → {_new_status} (credits_deducted={_job.get('credits_deducted')})")
            except Exception as _e:
                logger.error(f"[WATCHDOG reaper 0b] update failed for {_jid}: {_e}")
    except Exception as _e:
        logger.warning(f"[WATCHDOG reaper 0b] query failed (transient, retry in 2min): {_e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "0b")
            scope.set_level("warning")
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
        logger.warning(f"[WATCHDOG] transcription_jobs re-enqueue query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "1a")
            scope.set_level("warning")
        sentry_sdk.capture_exception(e)

    # ── Pass 1b: playlist_extraction_jobs re-enqueue ──────────────────────
    # Handles two cases:
    #   'interrupted'   — mid-chain crash; re-enqueue next video in the chain
    #   'retry_pending' — ADR-030 Gap 1; retry-pass stale → re-enqueue retry-pass
    # Both statuses use the same query (same columns needed) then branch on status.
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .select('id,user_id,video_ids,video_results,completed,failed,total_videos,status,last_heartbeat_at,watchdog_attempts')
                .in_('status', ['interrupted', 'retry_pending'])
                .lt('watchdog_attempts', MAX_PLAYLIST_WATCHDOG_ATTEMPTS)
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
                    _attempts = job.get('watchdog_attempts', 0)
                    claim = await asyncio.to_thread(
                        lambda pid=playlist_id, a=_attempts: supabase.table('playlist_extraction_jobs').update({
                            'watchdog_attempts': a + 1,
                            'last_heartbeat_at': None,
                        }).eq('id', pid).eq('watchdog_attempts', a).execute()
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
                _attempts = job.get('watchdog_attempts', 0)
                claim = await asyncio.to_thread(
                    lambda pid=playlist_id, a=_attempts: supabase.table('playlist_extraction_jobs').update({
                        'status': 'running',
                        'watchdog_attempts': a + 1,
                        'last_heartbeat_at': None,
                    }).eq('id', pid).eq('watchdog_attempts', a).execute()
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
        logger.warning(f"[WATCHDOG] playlist_extraction_jobs re-enqueue query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "1b")
            scope.set_level("warning")
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
            try:
                await _refund_then_claim_job(supabase, job)
            except Exception as e:
                # Onverwachte exception (bv. de claim-UPDATE zelf raist). Retry-veilig: de refund
                # is idempotent en de status blijft 'interrupted' als de claim niet doorging.
                logger.error(f"[WATCHDOG] auto-refund failed for {job_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "2")
                    scope.set_tag("job_id", job_id)
                    scope.set_tag("user_id", str(job.get("user_id", "unknown")))
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.warning(f"[WATCHDOG] auto-refund query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2")
            scope.set_level("warning")
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
                await _refund_then_claim_playlist(supabase, job)
            except Exception as e:
                logger.error(f"[WATCHDOG] playlist auto-refund failed for {playlist_id}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "2b")
                    scope.set_tag("job_id", playlist_id)
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.warning(f"[WATCHDOG] playlist auto-refund query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "2b")
            scope.set_level("warning")
        sentry_sdk.capture_exception(e)

    # ── Pass 2c: reconciliatie-vangnet — gemiste terminale refunds ────────────────
    # Dekt het residuele gat dat de bounded-retry NIET dekt: een worker-crash tussen de
    # terminal-status-set en de refund-retries. Zulke jobs zijn al 'complete'/'error' → buiten
    # Pass 2/2b. De anti-join (credits_reserved>0 + geen refund-rij) levert precies die gemiste
    # refunds; Pass 2c boekt ze idempotent zonder de status te muteren (cap = 50 rijen/cyclus/tabel).
    await _reconcile_unrefunded_reserved(supabase, limit=50)

    # ── Pass 3: reap stale RUNNING playlists (stuck-playlist fix) ──────────────
    # Een 'running' playlist waarvan de ARQ-keten stierf is onzichtbaar voor Pass 1b/2b (die query'en
    # alleen 'interrupted'/'retry_pending') én voor de poll-endpoint (die flipt 'running'→'interrupted'
    # ALLEEN bij aanwezige heartbeat). Detectie op VOORTGANG (last_progress_at, fallback created_at)
    # ≥25min stale ÉN heartbeat ≥5min stale/NULL — zie _should_reap_running_playlist. De heartbeat-guard
    # sluit een levende worker (trage whisper) uit → geen latere settlement → geen money-loss.
    try:
        _reap_progress_cutoff = (now - timedelta(minutes=REAP_PROGRESS_STALE_MIN)).isoformat()
        result = await asyncio.to_thread(
            lambda: supabase.table('playlist_extraction_jobs')
                .select('id,user_id,video_ids,video_results,completed,failed,total_videos,'
                        'credits_reserved,last_heartbeat_at,last_progress_at,created_at')
                .eq('status', 'running')
                .or_(f'last_progress_at.lt.{_reap_progress_cutoff},last_progress_at.is.null')
                .limit(200)
                .execute()
        )
        for job in (result.data or []):
            if not _should_reap_running_playlist(job, now):
                continue
            try:
                await _reap_stale_running_playlist(supabase, job)
            except Exception as e:
                logger.error(f"[WATCHDOG reap] failed for {job.get('id')}: {e}")
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("task_name", "watchdog_interrupted_jobs")
                    scope.set_tag("pass", "reap-running")
                    scope.set_tag("job_id", str(job.get('id')))
                sentry_sdk.capture_exception(e)
    except Exception as e:
        logger.warning(f"[WATCHDOG reap] query failed (transient, retry in 2min): {e}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task_name", "watchdog_interrupted_jobs")
            scope.set_tag("pass", "reap-running")
            scope.set_level("warning")
        sentry_sdk.capture_exception(e)


async def noop_task(ctx: dict) -> str:
    """Fase 1 stub — verifies the worker picks up jobs from the queue."""
    return "ok"


def _parse_decodo_traffic(payload) -> list:
    """Parse the Decodo v2 statistics/traffic response (grouped by day) into [{day, rx, tx}].
    Live-verified shape: top-level {metadata, data}, each data row {"key": "2026-07-16 00:00:00",
    "rx_bytes": N, "tx_bytes": N, "rx_tx_bytes": N, "requests": N}. Raises loudly if it can't find
    parseable rows (→ recorded as a FAILED fetch → UI 'unavailable', never a fabricated number)."""
    items = None
    if isinstance(payload, dict):
        for k in ("data", "results", "traffic", "items", "rows"):
            if isinstance(payload.get(k), list):
                items = payload[k]
                break
    elif isinstance(payload, list):
        items = payload
    if items is None:
        raise RuntimeError(f"unexpected Decodo response shape: {type(payload).__name__}")
    out = []
    for it in items:
        if not isinstance(it, dict):
            continue
        # Decodo names the grouped day "key" ("Y-m-d H:i:s"); keep the fallbacks defensive.
        day = it.get("key") or it.get("date") or it.get("day") or it.get("period") or it.get("timestamp")
        if not day:
            continue
        rx = it.get("rx_bytes") or it.get("rx") or it.get("download_bytes") or it.get("bytes_received") or 0
        tx = it.get("tx_bytes") or it.get("tx") or it.get("upload_bytes") or it.get("bytes_sent") or 0
        out.append({"day": str(day)[:10], "rx": int(rx or 0), "tx": int(tx or 0)})
    if not out:
        raise RuntimeError("Decodo response had no parseable daily traffic rows")
    return out


async def fetch_service_metrics(ctx: dict) -> str:
    """F17 nightly (02:00 UTC): Decodo billed traffic (Finance reconciliation). Best-effort — a failure
    records the attempt (keeps last_success_at, never a fabricated number) and moves on. The DeepSeek
    prepaid-balance poll was removed when the AI-summary provider moved to the AssemblyAI EU LLM Gateway
    (ADR-068); AssemblyAI is PAYG with no balance API → nothing to fetch. All keys live only on this worker."""
    import httpx
    sb = get_supabase_client()

    # ── Decodo billed traffic (last 3 days grouped by day — catches late-settling data) ──
    dc_key = os.getenv("DECODO_API_KEY")
    try:
        if not dc_key:
            raise RuntimeError("DECODO_API_KEY not set")
        # Live-verified contract (all four were wrong in the first F17 draft): auth = the RAW key (no
        # "Bearer "); body needs proxyType="residential_proxies"; dates must be "Y-m-d H:i:s" (not date-only).
        now_dt = datetime.now(timezone.utc)
        today = now_dt.date()
        # Watermark pattern (not a fixed N-day window): resume from the last day we already have, minus a 1-day
        # lookback. The lookback has a measured basis — Decodo registers traffic in ~1s and doesn't revise within
        # 3h (see nightly-jobs.md B); 1 day is ample slack and the day-keyed upsert makes the overlap free. Effect:
        # a multi-night worker outage can't create a permanent gap — the next run pulls every missing day back to
        # the watermark. Empty table → fall back to business_start_date (config), never a hardcoded date.
        wm = sb.table("decodo_daily_usage").select("day").order("day", desc=True).limit(1).execute()
        if wm.data:
            watermark = date.fromisoformat(str(wm.data[0]["day"])[:10])
        else:
            bs = sb.table("finance_settings").select("value").eq("key", "business_start_date").limit(1).execute()
            watermark = date.fromisoformat(str(bs.data[0]["value"])[:10]) if bs.data else date(2026, 1, 1)
        start_day = watermark - timedelta(days=1)
        # Cap the span: Decodo's statistics API returns at most 100 day-items; a >90-day catch-up is an extreme
        # outage that needs manual backfill anyway. Bound it so one run can't build a request Decodo truncates.
        if (today - start_day).days > 90:
            start_day = today - timedelta(days=90)
        body = {
            "proxyType": "residential_proxies",
            "startDate": start_day.strftime("%Y-%m-%d 00:00:00"),
            "endDate": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "groupBy": "day",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.decodo.com/api/v2/statistics/traffic",
                headers={"Authorization": dc_key, "Content-Type": "application/json", "Accept": "application/json"},
                json=body,
            )
            resp.raise_for_status()
            rows = _parse_decodo_traffic(resp.json())
        now_iso = datetime.now(timezone.utc).isoformat()
        by_day = {r["day"]: (r["rx"], r["tx"]) for r in rows}
        # Write a row for EVERY day in [start_day, today] INCLUSIVE — 0 bytes when Decodo reported no traffic —
        # so downstream "a row exists" == "this day is covered". Without a per-day row, a no-traffic day (Decodo
        # returns nothing) is indistinguishable from a never-fetched day.
        # TODAY is now INCLUDED: the measured delay is ~1s with no revision in 3h, so today's number is reliable
        # almost immediately. If something does trail in, the 1-day-lookback re-write on the next run corrects it.
        write_days = []
        d = start_day
        while d <= today:
            write_days.append(d.isoformat())
            d += timedelta(days=1)
        for dd in write_days:
            rx, tx = by_day.get(dd, (0, 0))
            await asyncio.to_thread(lambda dd=dd, rx=rx, tx=tx: sb.table("decodo_daily_usage").upsert({
                "day": dd, "rx_bytes": rx, "tx_bytes": tx, "billed_bytes": rx + tx,
                "fetched_at": now_iso}, on_conflict="day").execute())
        await asyncio.to_thread(lambda: sb.rpc("record_service_fetch", {
            "p_service": "decodo", "p_ok": True, "p_error": None}).execute())
        logger.info(f"[service-metrics] decodo watermark {start_day}→{today}, wrote {len(write_days)} day(s), {len(rows)} with traffic")
    except Exception as e:
        logger.warning(f"[service-metrics] decodo fetch failed: {e}")
        await asyncio.to_thread(lambda: sb.rpc("record_service_fetch", {
            "p_service": "decodo", "p_ok": False, "p_error": str(e)[:500]}).execute())

    return "ok"


class WorkerSettings:
    functions = [
        noop_task,
        run_whisper_job,
        arq_func(process_playlist_video, keep_result=0),
        arq_func(process_playlist_retries, keep_result=0),
        watchdog_interrupted_jobs,
        fetch_service_metrics,
    ]
    cron_jobs = [
        # Elke 2 minuten: detecteer crashed jobs en start crash-recovery.
        cron(watchdog_interrupted_jobs, minute=set(range(0, 60, 2))),
        # F17 nightly 02:00 UTC: Decodo billed traffic (Finance reconciliation). One run/day is enough —
        # Decodo settles within hours and the day-keyed upsert makes overlap free (see nightly-jobs.md).
        cron(fetch_service_metrics, hour={2}, minute={0}),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("ARQ_REDIS_URL") or "redis://localhost:6379"
    )
    keep_result = 3600  # default for run_whisper_job / noop_task
    # job_timeout uit config (commit 3, Defect 1): afgeleid van MAX_TRANSCRIPTION_SECONDS + marge in
    # transcription_pipeline.py, i.p.v. een vlakke 7200s. De oude 2u was KORTER dan wat een lange-maar-
    # geaccepteerde file (tot 10u audio) nodig kan hebben → ARQ killde zulke jobs halverwege. De poll-
    # loop tikt per poll een heartbeat, dus de watchdog (Pass 0b, 10min) vangt een écht hangende job
    # ruim vóór deze royale backstop. Playlist-jobs (100+ videos) vallen ook binnen deze grens.
    job_timeout = TRANSCRIPTION_JOB_TIMEOUT_SECONDS

    # ── Graceful drain op deploy (SIGTERM) ────────────────────────────────────────────
    # Env-gated → inert by default (0 = huidig gedrag, geen risico tot expliciet aangezet).
    # Bij >0: arq stopt op SIGTERM met NIEUWE jobs oppakken (allow_pick_jobs=False) en wacht
    # dit aantal seconden op in-flight jobs vóór het cancelt. VEREIST op de Railway worker-
    # service, anders triggert dit nooit:
    #   - RAILWAY_DEPLOYMENT_DRAINING_SECONDS >= ARQ_JOB_COMPLETION_WAIT  (Railway-default = 0
    #     = directe SIGKILL, die het drain-venster volledig overslaat)
    #   - Start Command `exec python -m arq worker.WorkerSettings` zodat SIGTERM python bereikt
    #     (kaal `python -m arq …` onder `sh -c` laat sh PID 1 en slikt het signaal op)
    # Korte jobs (captions, korte whisper) ronden schoon af. Lange jobs die het venster
    # overschrijden worden gecancelled → later her-gedraaid (arq retry_jobs op CancelledError,
    # óf de watchdog-cron). Een re-run rekent NOOIT dubbel af: reserve/settle/refund zijn
    # idempotent via de UNIQUE (job_id,kind)-index (ADR-050); het legacy deduct_credits_atomic-
    # pad is dormant (RESERVATION_ENABLED=true). Zie priorities.md 1.34.
    handle_signals = True
    job_completion_wait = int(os.getenv("ARQ_JOB_COMPLETION_WAIT", "0"))

    # NOTE — ack_late bestaat NIET in arq 0.28.0 (Celery-concept). Jobs worden bij PICKUP
    # geacknowledged. Bij een HARDE SIGKILL (crash / grace-window overschreden) gaat de in-flight
    # job verloren → crash-recovery via de watchdog-cron (watchdog_interrupted_jobs, elke 2 min).
    # Bij een GRACEFUL cancel (job_completion_wait verstreken) re-queuet arq de job zelf
    # (retry_jobs=True, arq-default). Beide re-runs zijn idempotent (zie hierboven).

