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
from datetime import datetime, timezone, timedelta
from typing import Optional

import posthog
import sentry_sdk
from lingua import Language, LanguageDetectorBuilder

from audio_utils import (
    MembersOnlyVideoError,
    MEMBERS_ONLY_KEYWORDS,
    compress_audio_if_needed,
    extract_youtube_audio,
    get_audio_container,
    get_audio_duration,
    needs_provider_transcode,
    validate_audio_file,
)
from limits import MAX_TRANSCRIPTION_SECONDS  # single source (backend-handhaver); re-exported hier
from assemblyai_client import submit_assemblyai, poll_assemblyai
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
# EU host with an explicit EU-fallback — a missing env must never fall back to the SDK's US default.
posthog.host = os.getenv("POSTHOG_HOST", "https://eu.i.posthog.com")
posthog.disable_geoip = True  # no IP-based geo enrichment on server-side events


async def _heartbeat_loop(heartbeat_fn, interval: int = 60) -> None:
    """Roept heartbeat_fn elke `interval` seconden aan totdat de task gecanceld wordt."""
    while True:
        await asyncio.sleep(interval)
        try:
            await heartbeat_fn()
        except Exception:
            pass  # nooit crashen door heartbeat-fout


# Per-extractie wall-clock ceilings (stuck-playlist fix). Kappen een hangende yt-dlp-download/
# caption-extractie zodat één video de sequentiële playlist-keten niet blokkeert. Ruim boven normaal,
# ver onder de watchdog reap-drempel (25min) en de 2u ARQ job_timeout. NOOIT op AssemblyAI-polling.
CAPTION_EXTRACT_TIMEOUT = 120.0   # captions = tekst; seconden normaal, 120s vangt een yt-dlp-hang

# Fix 2: de audio-download-timeout wordt AFGELEID van de videoduur i.p.v. een vlakke 600s. 600s was
# fout in beide richtingen: een clip van 5 min haalt 'm nooit nodig, een video van 76 min verloor met
# 17 seconden (82 MB net niet binnen 600s). Formule: basis + royale marge per audio-minuut, met een
# absolute bovengrens ver onder de ARQ-backstop (TRANSCRIPTION_JOB_TIMEOUT_SECONDS). De deadline-hook in
# extract_youtube_audio hanteert deze grens HARD (breekt de download echt af); _run_with_heartbeat houdt
# er een coarse buffer omheen voor een volledig gestalde socket (geen progress → hook vuurt niet).
DOWNLOAD_TIMEOUT_BASE_SECONDS = 180          # vaste basis: metadata/handshake/ffmpeg-overhead
DOWNLOAD_TIMEOUT_PER_MINUTE_SECONDS = 25     # royale marge per audio-minuut (trage residential exit)
DOWNLOAD_TIMEOUT_CEILING_SECONDS = 3600      # absolute bovengrens (60min) — << ARQ 37800s
DOWNLOAD_TIMEOUT_DEFAULT_MINUTES = 120       # duur onbekend → genereus (nooit een legit download killen)

# ADR-095 vroege-screening: v_norm (verwachte normale-exit-doorvoer) komt uit
# cost_config.download_normal_bytes_per_sec (afgeleid uit de meetlaag-mediaan). Deze fallback (=2,3
# Mbit/s = 287500 B/s) geldt alleen als de config-read faalt, zodat screening niet stil uitvalt.
SCREEN_NORMAL_BYTES_PER_SEC_FALLBACK = 287500.0


def _derive_download_timeout(est_minutes: Optional[float]) -> float:
    """Download-wall-clock-budget afgeleid van de geschatte videoduur (minuten). Onbekend → default."""
    mins = est_minutes if (est_minutes and est_minutes > 0) else DOWNLOAD_TIMEOUT_DEFAULT_MINUTES
    return float(min(
        DOWNLOAD_TIMEOUT_CEILING_SECONDS,
        DOWNLOAD_TIMEOUT_BASE_SECONDS + mins * DOWNLOAD_TIMEOUT_PER_MINUTE_SECONDS,
    ))


async def _run_with_heartbeat(awaitable, heartbeat_fn, timeout: Optional[float] = None):
    """
    Voert `awaitable` uit terwijl `heartbeat_fn` elke 60s op de achtergrond tikt.
    Als heartbeat_fn None is, wordt awaitable direct uitgevoerd (geen overhead).

    Als `timeout` gezet is, wordt de awaitable na `timeout` seconden afgebroken met een
    `TimeoutError` waarvan de message "timed out" bevat → `_classify_download_error` mapt 'm naar
    het bestaande retryable `'timeout'`-type (error→refund→retry). GEBRUIK ALLEEN op de
    yt-dlp/caption-EXTRACTIE-stap (waar de hang zit), NOOIT op de AssemblyAI-transcriptie-poll —
    een legitiem trage whisper-video mag niet gekilld worden. NB: bij een `asyncio.to_thread`-
    awaitable stopt de timeout de onderliggende thread niet (Python kan threads niet killen); de
    coroutine raist wél en de keten gaat door — de losgekoppelde thread eindigt vanzelf.
    """
    async def _await_it():
        if timeout is None:
            return await awaitable
        try:
            return await asyncio.wait_for(awaitable, timeout)
        except asyncio.TimeoutError:
            raise TimeoutError(f"extraction timed out after {timeout:.0f}s")

    if heartbeat_fn is None:
        return await _await_it()
    task = asyncio.create_task(_heartbeat_loop(heartbeat_fn))
    try:
        return await _await_it()
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


# ── Commit 3 (submit+poll) — transcriptie-timeout uit config (Defect 1) ──────────────
# De ARQ job_timeout stond vlak op 7200s (2u), maar MAX_TRANSCRIPTION_SECONDS accepteert audio tot
# 10u — een lange-maar-geaccepteerde file kon zo door ARQ gekilld worden midden in de transcriptie.
# We leiden de timeout nu af van de MAX geaccepteerde duur + een marge (download/upload/overhead).
# AssemblyAI async verwerkt sneller dan realtime, dus MAX_TRANSCRIPTION_SECONDS is een ROYALE
# bovengrens op de verwerkingstijd; genereus is hier veilig: de poll-loop heeft zijn eigen deadline
# én tikt elke poll een heartbeat, dus de watchdog (Pass 0b, 10min stale) vangt een écht hangende job
# ruim vóór deze ARQ-backstop. worker.WorkerSettings.job_timeout leest TRANSCRIPTION_JOB_TIMEOUT_SECONDS.
# MAX_TRANSCRIPTION_SECONDS wordt geïmporteerd uit limits.py (single source, backend-handhaver) en
# hierboven al beschikbaar; worker.py + main.py importeren 'm nog steeds uit deze module (re-export).
TRANSCRIPTION_TIMEOUT_MARGIN_SECONDS = 30 * 60  # 1800 — download/upload/overhead-marge
TRANSCRIPTION_JOB_TIMEOUT_SECONDS = MAX_TRANSCRIPTION_SECONDS + TRANSCRIPTION_TIMEOUT_MARGIN_SECONDS
ASSEMBLYAI_POLL_INTERVAL_SECONDS = 10           # poll-cadans == heartbeat-cadans in submit+poll


def _resume_reject_reason(data: dict) -> Optional[str]:
    """
    Pure gate voor het HERGEBRUIKEN van een opgeslagen provider_transcript_id na een worker-herstart.
    Retourneert None als hergebruik is toegestaan, anders een reden-string (→ opnieuw indienen + loggen).
    Verkeerde inhoud > dubbel betalen: twijfel valt ALTIJD naar opnieuw indienen. Voorwaarden die hier
    worden bewaakt (de queued/processing-statuscheck gebeurt op de live poll, niet hier):
      - de job staat niet in een eindtoestand (anders horen we hier niet te zijn),
      - er is een submitted_at, en die valt binnen AssemblyAI's bewaartermijn (TTL = 1 dag).
    (De 'zelfde jobrij'-voorwaarde is structureel: we lezen provider_transcript_id ALLEEN van de eigen
    job_id-rij, nooit via video_id/user_id of iets dat kan botsen.)
    """
    status = data.get('status')
    if status in ('complete', 'error'):
        return f'job terminal ({status})'
    sub = data.get('submitted_at')
    if not sub:
        return 'geen submitted_at'
    try:
        sub_dt = datetime.fromisoformat(str(sub).replace('Z', '+00:00'))
    except Exception:
        return 'submitted_at onparseerbaar'
    if sub_dt < datetime.now(timezone.utc) - timedelta(days=1):
        return 'submitted_at > 1 dag (buiten AssemblyAI TTL)'
    return None


async def _submit_and_poll(audio_path: str, *, job_id: Optional[str], heartbeat_fn, supabase) -> dict:
    """
    Dien in bij AssemblyAI en poll tot done (submit+poll, commit 3). Vervangt de blocking
    transcribe()-call zodat we per poll een heartbeat tikken (lange jobs triggeren de watchdog niet)
    en de wachtrij-/verwerkings-fase apart kunnen meten (Operations: queue-wait vs processing).

    Resume-veilig: staat er al een provider_transcript_id op DEZE jobrij en is die STRAK geldig
    (niet-terminaal, binnen TTL, en de live poll geeft queued/processing), dan pollen we die door
    i.p.v. opnieuw in te dienen — geen dubbele facturering. Elke twijfel → opnieuw indienen + loggen
    (verkeerde inhoud is onherstelbaar, dubbel betalen niet).

    Retourneert het bestaande whisper_result-contract:
      { 'success': True, 'transcript': [...], 'duration': float, 'model': str|None, 'language': str|None }
      { 'success': False, 'error': str }
    Schrijft onderweg de Operations-capture-kolommen op de jobrij (best-effort, faalt nooit de job):
      submitted_at, provider_transcript_id, provider_processing_at, provider_processing_ms,
      assemblyai_language, assemblyai_model.
    """
    async def _cap(**cols) -> None:
        if not job_id:
            return
        try:
            await asyncio.to_thread(
                lambda: supabase.table('transcription_jobs').update(cols).eq('id', job_id).execute()
            )
        except Exception as e:
            logger.warning(f"[submit+poll] capture-write faalde job={job_id}: {e}")

    provider_id: Optional[str] = None
    processing_at_iso: Optional[str] = None

    # ── Resume-check: STRAK begrensd hergebruik van een lopende provider-job ──
    if job_id:
        try:
            row = await asyncio.to_thread(
                lambda: supabase.table('transcription_jobs')
                    .select('provider_transcript_id,submitted_at,provider_processing_at,status')
                    .eq('id', job_id).single().execute()
            )
            data = row.data or {}
        except Exception:
            data = {}
        candidate = data.get('provider_transcript_id')
        if candidate:
            reason = _resume_reject_reason(data)
            if reason is None:
                polled = await asyncio.to_thread(poll_assemblyai, candidate)
                pstatus = polled.get('status')
                # Alleen hergebruiken bij een ACTIEF lopende job. completed/error/onbekend → opnieuw
                # indienen (een completed provider-job kan van een oudere submission zijn: gok niet).
                if polled.get('success') and pstatus in ('queued', 'processing'):
                    provider_id = candidate
                    processing_at_iso = data.get('provider_processing_at')
                    logger.info(
                        f"[submit+poll] RESUME: her-poll provider_transcript_id={candidate} "
                        f"(status={pstatus}) job={job_id}"
                    )
                else:
                    logger.info(
                        f"[submit+poll] provider id {candidate} niet herbruikbaar "
                        f"(poll success={polled.get('success')}, status={pstatus}) → opnieuw indienen job={job_id}"
                    )
            else:
                logger.info(
                    f"[submit+poll] provider id {candidate} afgewezen ({reason}) → opnieuw indienen job={job_id}"
                )

    # ── Verse submission ──
    if provider_id is None:
        sub = await asyncio.to_thread(submit_assemblyai, audio_path)
        if not sub.get('success'):
            return {'success': False, 'error': sub.get('error', 'submit failed')}
        provider_id = sub['transcript_id']
        processing_at_iso = None
        await _cap(
            provider_transcript_id=provider_id,
            submitted_at=datetime.now(timezone.utc).isoformat(),
            provider_processing_at=None,
            provider_processing_ms=None,
        )
        logger.info(f"[submit+poll] submitted provider_transcript_id={provider_id} job={job_id}")

    # ── Poll-loop met per-iteratie heartbeat + eigen deadline ──
    deadline = time.time() + TRANSCRIPTION_JOB_TIMEOUT_SECONDS
    while True:
        if heartbeat_fn is not None:
            try:
                await heartbeat_fn()
            except Exception:
                pass
        polled = await asyncio.to_thread(poll_assemblyai, provider_id)
        if not polled.get('success'):
            # De poll-call zelf faalde (transient netwerk/SDK) — niet meteen opgeven; retry tot deadline.
            if time.time() > deadline:
                return {'success': False, 'error': f"poll bleef falen: {polled.get('error')}"}
            await asyncio.sleep(ASSEMBLYAI_POLL_INTERVAL_SECONDS)
            continue

        status = polled['status']
        if status == 'processing' and processing_at_iso is None:
            processing_at_iso = datetime.now(timezone.utc).isoformat()
            await _cap(provider_processing_at=processing_at_iso)

        if status == 'completed':
            # provider_processing_ms = observed processing→completed. Zagen we processing nooit (job te
            # snel klaar tussen polls), laat ms leeg i.p.v. gokken.
            ms: Optional[int] = None
            if processing_at_iso:
                try:
                    p_at = datetime.fromisoformat(str(processing_at_iso).replace('Z', '+00:00'))
                    ms = int((datetime.now(timezone.utc) - p_at).total_seconds() * 1000)
                except Exception:
                    ms = None
            await _cap(
                provider_processing_ms=ms,
                assemblyai_language=polled.get('language'),
                assemblyai_model=polled.get('model'),
                # Diarisatie stond aan bij de submission (speaker_labels) → +$0,02/u add-on.
                # Vlag op de jobrij zodat _geld_scope de add-on-COR alleen bij deze jobs telt
                # (legacy pre-diarisatie jobs blijven false → geen retroactieve COR-verschuiving).
                diarization=True,
            )
            return {
                'success': True,
                'transcript': polled.get('transcript') or [],
                'duration': polled.get('duration') or 0,
                'model': polled.get('model'),
                'language': polled.get('language'),
                # Kwaliteitssignalen (ADR-096) doorgeven zodat de pipeline ze op de jobrij persisteert.
                'confidence': polled.get('confidence'),
                'language_confidence': polled.get('language_confidence'),
            }
        if status == 'error':
            return {'success': False, 'error': polled.get('error', 'transcription failed')}
        if time.time() > deadline:
            return {'success': False, 'error': f'transcription poll timed out after {TRANSCRIPTION_JOB_TIMEOUT_SECONDS}s'}
        await asyncio.sleep(ASSEMBLYAI_POLL_INTERVAL_SECONDS)


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
    """Map a download error string to a canonical error_type slug.

    These slugs are the source of truth for the frontend's shared ErrorCard copy map
    (ADR-080) — packages/shared/src/components/transcribe/errorCopy.ts. Any new slug added
    here should get an entry there; unmapped codes still render a neutral card, are shown to
    the user, and are logged, but tailored copy lives in the map. Keep the two in sync.
    """
    lower = error_msg.lower()
    if any(kw in lower for kw in MEMBERS_ONLY_KEYWORDS):
        return 'members_only'
    if any(kw in lower for kw in ('age-restricted', 'age restricted', 'only available on youtube', 'confirm your age')):
        return 'age_restricted'
    if any(kw in lower for kw in ('sign in to confirm', 'confirming you', 'not a bot', 'error 429', 'too many requests')):
        return 'bot_detection'
    # Proxy auth / tunnel failure (Decodo) — checked BEFORE timeout: "Tunnel connection failed: 504
    # Gateway Timeout" is a proxy problem, not a timeout. Own actionable category (our proxy).
    if any(kw in lower for kw in ('proxy authentication', '407 proxy', 'unable to connect to proxy',
                                  'tunnel connection failed', 'tunnelconnectionfailed', 'proxyerror')):
        return 'proxy_error'
    # Afgebroken download (content-length mismatch) — vóór de transient-takken, want een byte-telling
    # kan cijfers als '504' bevatten. Specifieke keywords, geen numerieke false-positives (ADR-031).
    if any(kw in lower for kw in ('bytes read', 'more expected', 'incomplete read')):
        return 'partial_write'
    # Transient failures are split into HONEST, distinct codes. A TLS/connection drop is NOT a
    # timeout; lumping them poisons the failure-reason breakdown (a wrong category is worse than an
    # empty one). All three below are still transient/retryable and stay wired through the retry
    # gates (worker retry-set + RPC v_has_retryable IN-list — keep those three lists in sync).
    # Unmatched download errors fall through to 'extraction_error' (honest catch-all), NEVER 'timeout'.
    # (a) Genuine timeouts only.
    if any(kw in lower for kw in (
        'timed out', 'timeout', 'read timed out', 'connection timed out', 'gateway timeout',
    )):
        return 'timeout'
    # (b) Connection / TLS / DNS drop — reset, refused, SSL/TLS handshake, EOF, name resolution.
    if any(kw in lower for kw in (
        'connection reset', 'connection aborted', 'connection refused', 'connection error',
        'connection broken', 'broken pipe', 'econnreset', 'remote end closed', 'network is unreachable',
        'eof occurred', 'unexpected_eof', 'ssl', 'tls', 'certificate', 'bad handshake',
        'getaddrinfo', 'name or service not known', 'temporary failure in name resolution',
    )):
        return 'connection_error'
    # (c) Upstream HTTP 5xx (YouTube / proxy server-side), transient. Textuele vormen + 'http error 50x'
    # i.p.v. bare cijfers (die matchen spuriously in byte-tellingen/URLs).
    if any(kw in lower for kw in (
        'internal server error', 'bad gateway', 'service unavailable', 'temporarily unavailable',
        'http error 500', 'http error 502', 'http error 503',
    )):
        return 'server_error'
    # yt-dlp could not parse YouTube's player response — typically needs a yt-dlp bump, not a retry.
    if any(kw in lower for kw in ('unable to extract', 'nsig', 'failed to extract', 'player response', 'requested format is not available')):
        return 'ytdlp_parse'
    # Structurally unavailable on YouTube (removed / private / geo-blocked / terminated account).
    if '152' in error_msg or any(kw in lower for kw in (
        'unavailable', 'private video', 'video is private', 'has been removed',
        'account associated with this video has been terminated', 'no longer available',
        'not available in your country', 'blocked it in your country',
    )):
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
    # ADR-050 fase 2: gereserveerde job → verreken aan het eind (reserved − settled). Dit is nu primair
    # het SUCCESS-pad (refund=verschil bij over-reservering; whisper-success zet transcript_id → buiten
    # Pass 2). Op FAILURE heeft _update_job de refund al vóór de status='error'-write geboekt (point 1),
    # dus deze aanroep is daar een idempotente no-op (safety net). Bounded idempotente retry
    # (refund_credits idempotent via (job_id,'refund')); alarmeert als álle pogingen falen. Residueel
    # crash-gap wordt door de watchdog Pass 2c-reconciliatie gedekt.
    if reservation_mode:
        await refund_with_retry(job_id, None, context="whisper-settle")
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
    known_duration_seconds: Optional[float] = None,
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
    # Upload-pad: main.py schreef het geüploade bestand naar een temp-pad (delete=False) en geeft dat
    # als audio_path mee. Registreer het NU zodat het finally-blok het ALTIJD verwijdert — bij success,
    # bij elke error én ongeacht compressie. (YouTube-pad komt binnen met audio_path=None en append't
    # zijn download zelf verderop; daar is dit dus een no-op.) Zonder dit lekte het rauwe upload-bestand
    # op het geslaagde pad zonder compressie — empirisch bevestigd.
    if audio_path is not None:
        temp_files.append(audio_path)
    credit_cost = 0
    credits_deducted = False

    async def _update_job(**kwargs):
        if not job_id:
            return
        # Point 1 (geldpad — terugstorting mag niet te laat komen): op een GERESERVEERD pad moet een
        # terminale error-transitie EERST refunden (dat commit credits_refunded op de rij via de
        # refund_credits-RPC) en PAS DAARNA status='error' schrijven. De frontend markeert de job af op
        # dat eerste terminale Realtime-bericht (de volle rij) en negeert alles daarna; door eerst te
        # refunden draagt dat bericht credits_refunded al, dus de gebruiker ziet dat zijn credits terug
        # zijn. Faalt de refund NA een geslaagde statusupdate, dan geldt de job als mislukt zonder
        # terugstorting (de slechte kant om op te falen). Omgedraaid is het ergste geval een
        # teruggestorte job die nog niet als mislukt staat — die vangt de watchdog (Pass 2c). Alleen
        # waar daadwerkelijk gereserveerd is (reservation_mode); insufficient_credits (niets
        # gereserveerd) draait hier niet doorheen. Idempotent via (job_id,'refund'), dus nooit dubbel.
        if kwargs.get('status') == 'error' and reservation_mode:
            await refund_with_retry(job_id, None, context=f"whisper-fail-{kwargs.get('error_type')}")
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
                        await _update_job(status="error", error_message=msg, error_type="credit_check_error")
                        return {"success": False, "error_type": "credit_check_error", "error_message": msg, "credit_cost": 0}
                    if balance < credit_cost:
                        await _update_job(status="error", error_message="Insufficient credits", error_type="insufficient_credits")
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
                        product_type='ai_transcription',
                    )
                    if not deduction_result.get('success'):
                        await _update_job(status="error", error_message="Credit deduction failed", error_type="credit_deduction_failed")
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
                    cache_hit=True,  # B2b: master-cache-hit → COR=0 (geen AssemblyAI/proxy), credits wél gesettled
                    cost_eur=0,      # ADR-096: cache-hit → geen provider-/proxy-kost
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
        proxy_bytes = None  # Decodo egress bytes; only set on the YouTube download path
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
            # Fix 2: leid de download-timeout af van de geschatte videoduur. credits_reserved ≈ minuten
            # (bij reservering gezet uit de metadata-duur, 1 credit = 1 min); onbekend → genereuze default.
            est_minutes: Optional[float] = None
            if job_id:
                try:
                    _rr = await asyncio.to_thread(
                        lambda: supabase.table('transcription_jobs')
                            .select('credits_reserved').eq('id', job_id).single().execute()
                    )
                    est_minutes = (_rr.data or {}).get('credits_reserved') or None
                except Exception:
                    est_minutes = None
            _dl_timeout = _derive_download_timeout(est_minutes)
            logger.info(f"[pipeline] download-budget={_dl_timeout:.0f}s (est_minutes={est_minutes}) video={video_id} job={job_id}")

            # ADR-095: v_norm voor de vroege screening uit cost_config (fallback bij read-fout zodat
            # screening niet stil uitvalt).
            _screen_vnorm: float = SCREEN_NORMAL_BYTES_PER_SEC_FALLBACK
            try:
                _cc = await asyncio.to_thread(
                    lambda: supabase.table('cost_config')
                        .select('download_normal_bytes_per_sec')
                        .order('effective_from', desc=True).limit(1).execute()
                )
                _v = (_cc.data[0].get('download_normal_bytes_per_sec') if _cc.data else None)
                if _v:
                    _screen_vnorm = float(_v)
            except Exception as _ce:
                logger.warning(f"[pipeline] cost_config v_norm read faalde, fallback {_screen_vnorm:.0f} B/s: {_ce}")

            # Point 2: sync progress-writer, aangeroepen (gethrottled) vanuit de yt-dlp progress-hook in
            # de download-thread. Schrijft rauwe bytes; de UI toont "19.2 / 50.4 MB". Faalt nooit hard.
            def _write_dl_progress(done: int, total: int) -> None:
                if not job_id:
                    return
                try:
                    supabase.table('transcription_jobs').update(
                        {'download_bytes': done, 'download_total_bytes': total}
                    ).eq('id', job_id).execute()
                except Exception as _pe:
                    logger.debug(f"[pipeline] download-progress write skipped job={job_id}: {_pe}")

            # Meet: per-job downloadduur + aantal pogingen (sync cb uit de download-thread, zoals
            # _write_dl_progress). Vuurt op élk eindpunt (succes én mislukking) → throughput
            # (proxy_bytes / download_ms) en her-download-versterking (download_attempts, egress vs
            # download_total_bytes) zijn direct queryebaar i.p.v. via een tijdstempel-benadering.
            def _write_dl_summary(download_ms: int, attempts: int, compress_ms: int = 0) -> None:
                if not job_id:
                    return
                try:
                    supabase.table('transcription_jobs').update(
                        {'download_ms': download_ms, 'download_attempts': attempts, 'compress_ms': compress_ms}
                    ).eq('id', job_id).execute()
                except Exception as _se:
                    logger.debug(f"[pipeline] download-summary write skipped job={job_id}: {_se}")

            try:
                audio_path, video_title, channel, proxy_bytes = await _run_with_heartbeat(
                    asyncio.to_thread(
                        extract_youtube_audio, video_id,
                        proxy_urls=proxy_urls, timeout_seconds=_dl_timeout,  # harde in-download deadline (Fix 3)
                        progress_cb=_write_dl_progress,                       # point 2: voortgangsbalk
                        summary_cb=_write_dl_summary,                         # meet: download_ms + attempts
                        screen_normal_bytes_per_sec=_screen_vnorm,            # ADR-095: vroege screening
                    ),
                    heartbeat_fn,
                    timeout=_dl_timeout + 180,  # coarse backstop rond de harde deadline → 'timeout' (retryable)
                )
                temp_files.append(audio_path)
                # Persist the Decodo egress bytes now — the proxy cost was incurred at download,
                # even if a later step (transcription) fails. Cost accounting must not lose it.
                if proxy_bytes is not None:
                    await _update_job(proxy_bytes=proxy_bytes)
            except MembersOnlyVideoError:
                await _update_job(status="error", error_message="members_only", error_type="members_only")
                return {"success": False, "error_type": "members_only", "credit_cost": 0}
            except Exception as e:
                error_msg = str(e)
                # BLOK B: de download consumeerde Decodo-egress ook al faalde 'ie. audio_utils hangt de
                # gesommeerde bytes (alle pogingen) op de exception → persisteer ze op de mislukte job,
                # anders logt een error-job 0 bytes ondanks verbruikte proxy-kost.
                err_bytes = getattr(e, 'proxy_bytes', 0) or 0
                if any(kw in error_msg.lower() for kw in MEMBERS_ONLY_KEYWORDS):
                    await _update_job(status="error", error_message="members_only", error_type="members_only", proxy_bytes=err_bytes)
                    return {"success": False, "error_type": "members_only", "credit_cost": 0}
                error_type = _classify_download_error(error_msg, video_id=video_id, job_id=job_id)
                # bot_detection/timeout/members_only zijn verwachte operationele uitkomsten, geen bugs.
                if error_type not in ('bot_detection', 'timeout', 'connection_error', 'server_error', 'members_only', 'no_captions'):
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
                await _update_job(status="error", error_message=error_msg, error_type=error_type, proxy_bytes=err_bytes)
                return {"success": False, "error_type": error_type, "error_message": error_msg, "credit_cost": 0}

        # ── Step 2: Validate ──────────────────────────────────────────────────
        validation = await asyncio.to_thread(validate_audio_file, audio_path)
        if not validation['valid']:
            await _update_job(status="error", error_message=validation['error'], error_type="validation_error")
            return {"success": False, "error_type": "validation_error", "error_message": validation['error'], "credit_cost": 0}

        # ── Step 3: Duration ──────────────────────────────────────────────────
        # ADR-050: bij een upload heeft main.py de duur al geprobed vóór reserve; hergebruik die
        # (niet dubbel proben). known_duration is ALLEEN gezet bij een geslaagde reserve-probe —
        # bij size_fallback is 'ie None en probet de pipeline zelf, zodat settle op de ECHTE duur
        # blijft. Settle-rekenwerk hieronder is ongewijzigd.
        try:
            if known_duration_seconds and known_duration_seconds > 0:
                duration = known_duration_seconds
            else:
                duration = await asyncio.to_thread(get_audio_duration, audio_path)
        except Exception as e:
            msg = f"Could not determine audio duration: {e}"
            await _update_job(status="error", error_message=msg, error_type="duration_error")
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
                await _update_job(status="error", error_message=msg, error_type="credit_check_error")
                return {"success": False, "error_type": "credit_check_error", "error_message": msg, "credit_cost": 0}

            if balance < credit_cost:
                logger.warning(f"[pipeline] Insufficient credits: has {balance}, needs {credit_cost} (job={job_id})")
                await _update_job(status="error", error_message="Insufficient credits", error_type="insufficient_credits")
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
                product_type='ai_transcription',
            )
            if not deduction_result.get('success'):
                logger.error(f"[pipeline] Credit deduction failed: {deduction_result.get('error')}")
                await _update_job(status="error", error_message="Credit deduction failed", error_type="credit_deduction_failed")
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

        # ── Step 5: Prepare audio for the provider ────────────────────────────
        # AssemblyAI accepts most containers raw (mp3/mp4/mov/flv/webm/…) and extracts the audio
        # itself. AVI and MKV are NOT on its supported list (verified 2026-08-12), so we extract the
        # audio here first. The DETECTED container (content, via ffprobe) decides — not the extension;
        # the temp file keeps the original extension, so matroska is split into mkv/webm correctly.
        # The same ffmpeg step also (legacy) compresses a file above the size cap. Either way -vn
        # strips video → mono Opus/OGG. This step only runs on the upload path (YouTube audio is
        # already extracted + compressed during download).
        must_transcode = False
        if audio_path:
            container = await asyncio.to_thread(get_audio_container, audio_path, audio_path)
            must_transcode = needs_provider_transcode(container)
        if must_transcode or validation['size_mb'] > 25:
            reason = f"container '{container}' not accepted raw by AssemblyAI" if must_transcode else "file exceeds 25MB"
            logger.info(f"[pipeline] Extracting audio ({reason}) (job={job_id})")
            try:
                compressed = await asyncio.to_thread(compress_audio_if_needed, audio_path, force=must_transcode)
                if compressed != audio_path:
                    temp_files.append(compressed)
                    audio_path = compressed
            except Exception as e:
                msg = f"Audio compression failed: {e}"
                await _update_job(status="error", error_message=msg, error_type="compression_error", duration_seconds=int(duration))
                return {"success": False, "error_type": "compression_error", "error_message": msg, "credit_cost": credit_cost}

        # ── Step 6: Transcribe ────────────────────────────────────────────────
        await _update_job(status="transcribing", started_at=job_started_at.isoformat())
        logger.info(f"[pipeline] Calling AssemblyAI: duration={duration:.1f}s cost={credit_cost}cr job={job_id}")
        _track(user_id, 'whisper_started', {
            'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
            'duration_seconds': duration,
        })
        assemblyai_start = time.time()
        # submit+poll (commit 3): non-blocking indienen + zelf pollen zodat de heartbeat per poll tikt
        # (lange jobs triggeren de watchdog niet), de queue-/processing-fase apart gemeten wordt, en een
        # worker-herstart de lopende provider-job veilig her-pollt i.p.v. dubbel in te dienen.
        whisper_result = await _submit_and_poll(
            str(audio_path), job_id=job_id, heartbeat_fn=heartbeat_fn, supabase=supabase,
        )
        # ADR-096: provider-fase (submit→completed, incl. upload+queue+processing).
        transcribe_ms = int((time.time() - assemblyai_start) * 1000)

        if not whisper_result['success']:
            _track(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
                'error_type': 'api_error', 'error_message': whisper_result['error'],
            })
            await _update_job(status="error", error_message=whisper_result['error'], error_type="api_error", duration_seconds=int(duration))
            return {"success": False, "error_type": "api_error", "error_message": whisper_result['error'], "credit_cost": credit_cost}

        if not whisper_result.get('transcript'):
            _track(user_id, 'whisper_failed', {
                'video_id': video_id, 'source_type': 'youtube' if video_id else 'upload',
                'error_type': 'no_speech', 'error_message': 'no_speech_detected',
            })
            await _update_job(status="error", error_message="no_speech_detected", error_type="no_speech", duration_seconds=int(duration))
            return {"success": False, "error_type": "no_speech", "credit_cost": credit_cost}

        # ── Step 7: Build transcript ──────────────────────────────────────────
        await _update_job(status="saving")
        _save_started = time.time()  # ADR-096: meet de opslaan-fase (persist+finaliseren)

        transcript = [
            {
                'text': item['text'], 'offset': item['offset'], 'duration': item['duration'],
                # Spreker-label alleen meenemen als diarisatie het leverde (anders geen key →
                # bestaande {text,offset,duration}-vorm blijft intact).
                **({'speaker': item['speaker']} if item.get('speaker') is not None else {}),
            }
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

        # Language: AssemblyAI's own detection (99 languages, with a confidence) is the SOURCE OF
        # TRUTH. The local lingua re-detection knows only 13 languages, so it is used ONLY as a
        # fallback when the provider returned nothing — never to overwrite a provider value (doing so
        # left 79% of transcripts with no language, and mis-labelled some, e.g. Hebrew stored as 'en').
        language: Optional[str] = normalize_language_code(whisper_result.get('language'))
        if not language:
            sample_text = ' '.join(item['text'] for item in transcript[:20])
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
        # Store the provider confidence WITH the transcript (not only on the job row), so the detected
        # language and how sure the provider was travel together. No threshold — we store what we know.
        _tconf = whisper_result.get('confidence')
        _lconf = whisper_result.get('language_confidence')
        if _tconf is not None:
            insert_data['transcript_confidence'] = _tconf
        if _lconf is not None:
            insert_data['language_confidence'] = _lconf
        if collection_id:
            insert_data['collection_id'] = collection_id

        result = await asyncio.to_thread(
            lambda: supabase.table('transcripts').insert(insert_data).execute()
        )
        transcript_id = result.data[0]['id']

        # Best-effort master cache write — YouTube-pad only (privacy-grens), alleen als
        # taal bekend is. (transcripts.language is NULLABLE en blijft dat; we schrijven alleen een
        # bekende taal naar de cache — een verzonnen 'unknown' zou de cache vervuilen.)
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
        save_ms = int((time.time() - _save_started) * 1000)  # ADR-096: opslaan-fase
        logger.info(f"[pipeline] Complete: {len(transcript)} segments, {credit_cost}cr, transcript_id={transcript_id}, job={job_id}, {processing_secs}s")
        await _update_job(
            status="complete",
            transcript_id=transcript_id,
            duration_seconds=int(duration),
            credits_cost=credit_cost,
            processing_time_seconds=processing_secs,
            assemblyai_model=whisper_result.get('model'),
            # ADR-096 meetlaag: fasetijden (provider + opslaan; download_ms/compress_ms zijn al door de
            # extract-summary_cb geschreven) + kwaliteitssignalen.
            transcribe_ms=transcribe_ms,
            save_ms=save_ms,
            transcript_confidence=whisper_result.get('confidence'),
            language_confidence=whisper_result.get('language_confidence'),
            **({"error_message": truncation_warning} if truncation_warning else {}),
        )
        # ADR-096: gedenormaliseerde kostprijs per job opslaan (single-source rates via cost_config).
        if job_id:
            try:
                await asyncio.to_thread(lambda: supabase.rpc('compute_and_store_job_cost', {'p_job_id': job_id}).execute())
            except Exception as _ce:
                logger.warning(f"[pipeline] cost_eur berekening faalde job={job_id}: {_ce}")
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
            await _update_job(status="error", error_message=f"Internal error: {e}", error_type="internal_error")
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
