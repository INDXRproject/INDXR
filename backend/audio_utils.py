"""
Audio processing utilities for INDXR.AI
Handles audio duration detection, YouTube audio extraction, and file validation
"""

import os
import math
import subprocess
import logging
import time
from typing import Dict, Optional, Callable
from pydub import AudioSegment
import yt_dlp
from yt_dlp.utils import DownloadCancelled

# Point 2: hoe vaak we de download-voortgang naar de DB schrijven. yt-dlp's progress-hook vuurt
# tientallen keren per seconde; we throttlen naar dit interval. 3s is bewust gekozen: het is ~de
# frontend-poll-cadans (useJobStatus pollt elke 2-3s en Realtime levert elke rij-update), dus sneller
# schrijven wordt toch niet vaker gezien, terwijl een langere download (minuten) de DB niet bestookt.
DOWNLOAD_PROGRESS_INTERVAL = 3.0

logger = logging.getLogger("indxr-backend")

# Supported upload formats (extension allowlist — mirrored by the frontend single source
# packages/shared/src/lib/uploadFormats.ts UPLOAD_EXTENSIONS). MOV and FLV are on AssemblyAI's own
# supported list (verified 2026-08-12) and are sent raw; AVI and MKV are NOT on that list, so their
# audio is extracted by us before submit — see PROVIDER_TRANSCODE_CONTAINERS + the pipeline Step 5.
SUPPORTED_FORMATS = {
    '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac',
    '.mov', '.flv', '.avi', '.mkv',
}
MAX_FILE_SIZE_MB = 500
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Containers AssemblyAI does NOT accept raw (not on its supported list, verified 2026-08-12). We
# extract the audio ourselves (mono Opus) before submit. Keyed on the DETECTED container from
# get_audio_container (content, not extension), so a mislabelled file is still handled correctly.
# NB: get_audio_container maps 'mov' → 'mp4' (provider-supported, sent raw), 'flv' → 'flv' (raw),
# and matroska → 'mkv' (unless the extension says .webm). So only avi/mkv land here.
PROVIDER_TRANSCODE_CONTAINERS = {'avi', 'mkv'}


def needs_provider_transcode(container: str) -> bool:
    """True when the source container must have its audio extracted before it goes to AssemblyAI
    (the provider doesn't accept it raw). See PROVIDER_TRANSCODE_CONTAINERS."""
    return container in PROVIDER_TRANSCODE_CONTAINERS

MEMBERS_ONLY_KEYWORDS = [
    'join this channel to get access to members-only content',
    'this video is available to this channel\'s members',
    'unplayable',
    'members-only',
]


class MembersOnlyVideoError(Exception):
    """Raised when a YouTube video is members-only and cannot be accessed."""
    pass


class SlowExitScreened(DownloadCancelled):
    """Raised uit de progress-hook wanneer de vroege snelheidsscreening (ADR-095) een te traag
    gepind exit-IP detecteert: de gemeten doorvoer zakt onder de progressie-afhankelijke vloer
    v_floor(p)=v_norm·(1−p)/(1+p). Subclass van DownloadCancelled zodat yt-dlp 'm schoon uit
    extract_info propageert; de extract-loop vangt 'm APART (vóór DownloadCancelled) en RETRYT met
    een verse sessie (i.t.t. de deadline-abort, die niet retryt). Draagt de doorvoer + het moment
    (progress, elapsed) mee voor de meetlaag-log."""
    def __init__(self, msg: str, throughput: float = 0.0, progress: float = 0.0, elapsed: float = 0.0):
        super().__init__(msg)
        self.throughput = throughput
        self.progress = progress
        self.elapsed = elapsed


# Vroege-screening ruis-drempels (ADR-095) — GEEN economische drempel (die is volledig afgeleid:
# v_floor(p)=v_norm·(1−p)/(1+p)), maar een meet-stabiliteitsgarantie. We screenen pas nadat er
# minstens SCREEN_MIN_SAMPLE_SECONDS ná het EERSTE gedownloade byte verstreken zijn (voorbij
# TCP-slow-start → stabiele gemiddelde doorvoer; << de 120s socket_timeout en een normale download).
SCREEN_MIN_SAMPLE_SECONDS = 10.0


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
            for fam in ('mp3', 'flac', 'wav', 'ogg'):
                if fam in names:
                    return fam
            if 'matroska' in names:
                # ffprobe reports 'matroska,webm' for BOTH .mkv and .webm — one demuxer, so the
                # content can't tell them apart. Use the extension hint WITHIN the confirmed family
                # (same pattern as the mp4/m4a branch below): .webm → 'webm' (AssemblyAI-supported,
                # sent raw), anything else in the family → 'mkv' (we extract the audio first).
                ext = os.path.splitext(filename_hint or '')[1].lstrip('.').lower()
                return 'webm' if ext == 'webm' else 'mkv'
            if names & {'mp4', 'm4a', 'mov'}:
                # mp4-familie (ffprobe kan m4a/mp4 niet los zien) — ext-hint kiest BINNEN de bevestigde
                # familie, dus geen leugen: de inhoud IS mp4/m4a, alleen het subtype uit de naam.
                ext = os.path.splitext(filename_hint or '')[1].lstrip('.').lower()
                return 'm4a' if ext == 'm4a' else 'mp4'
            return sorted(names)[0] if names else 'unknown'
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError) as e:
        logger.warning(f"ffprobe container-detect faalde: {e}")
    return 'unknown'


def has_usable_audio(file_path: str) -> bool:
    """True if the file contains at least one decodable audio stream, per ffprobe (content, not
    extension). Closes the rename gap: a file renamed to an accepted extension that carries no audio
    (a text file → .mp3, a silent screen recording with no audio track) is rejected up front instead
    of being reserved and then refunded. DELIBERATELY LENIENT — it does NOT require the extension to
    match the detected container (mp4/m4a/mov share a family, matroska covers mkv/webm); it only asks
    whether there is audio to transcribe at all. ffprobe unreadable → treated as no audio (False)."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-select_streams', 'a',
             '-show_entries', 'stream=codec_type',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0 and 'audio' in result.stdout.strip().lower().split():
            return True
        logger.info(f"has_usable_audio: no audio stream detected in {file_path} (rc={result.returncode})")
        return False
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError) as e:
        logger.warning(f"has_usable_audio ffprobe failed: {e}")
        return False


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


def _proxy_session_id(proxy_url: Optional[str]) -> str:
    """Haal het (niet-geheime) Decodo-session-id uit een proxy-URL voor logging. De URL is
    `http://user-<USER>-session-<SID>:<PASS>@<HOST>:<PORT>`; we geven <SID> terug en raken het
    wachtwoord NOOIT aan (dat blijft tussen ':' en '@' en wordt niet gelogd). None → 'none'."""
    if not proxy_url:
        return 'none'
    try:
        cred = proxy_url.split('//', 1)[1].split('@', 1)[0]  # user-<USER>-session-<SID>:<PASS>
        userpart = cred.split(':', 1)[0]                     # user-<USER>-session-<SID>  (pass weggeknipt)
        if '-session-' in userpart:
            return userpart.split('-session-', 1)[1]
        return 'unknown'
    except Exception:
        return 'unknown'


def extract_youtube_audio(
    video_id: str,
    output_dir: str = "/tmp",
    proxy_url: Optional[str] = None,
    proxy_urls: Optional[list] = None,
    timeout_seconds: Optional[float] = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
    summary_cb: Optional[Callable[[int, int, int], None]] = None,
    screen_normal_bytes_per_sec: Optional[float] = None,
) -> tuple[str, str, Optional[str], int]:
    """
    Extract audio from YouTube video using yt-dlp.

    Meet-instrumentatie (geen gedragswijziging): per download-poging wordt een gestructureerde regel
    gelogd (`[YT-DLP-AUDIO-ATTEMPT] video= attempt= session= bytes= duration_ms= throughput_mb_s=
    outcome=`) en per job een samenvatting (`[YT-DLP-AUDIO-SUMMARY]`). `summary_cb(download_ms,
    attempts)` wordt op ELK eindpunt (succes én mislukking) precies één keer aangeroepen zodat de
    caller de per-job downloadduur (som van de actieve poging-duren, excl. retry-backoff) en het aantal
    pogingen kan persisteren (transcription_jobs.download_ms/download_attempts) — throughput en
    her-download-versterking worden zo direct queryebaar. Session-id is niet geheim en wordt gelogd;
    het wachtwoord blijft gemaskeerd.

    Vroege snelheidsscreening (ADR-095): met `screen_normal_bytes_per_sec` (v_norm) aan breekt een
    niet-laatste poging vroeg af als de gemeten doorvoer onder de progressie-afhankelijke vloer
    v_floor(p)=v_norm·(1−p)/(1+p) zakt (afgeleid: afbreken+opnieuw kost evenredig met wat al
    gedownload is, dus de vloer daalt met de voortgang). Een screening-afbreking retryt met een verse
    sessie (nooit een job-fout zolang er pogingen over zijn) en logt als `outcome=screen_abort` met de
    doorvoer + het moment. De laatste poging screent niet (geen verse sessie meer om op over te
    stappen). None/0 → screening uit (backward-compat).

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

    # Fix 2/3: wall-clock deadline voor de HELE extract (alle pogingen samen), afgeleid van de
    # videoduur door de caller (transcription_pipeline). De progress-hook hieronder breekt de lopende
    # yt-dlp-download ECHT af zodra de deadline verstrijkt — DownloadCancelled stopt de download
    # in-process, i.t.t. een asyncio.wait_for van buitenaf die de thread liet doorlopen (die trok de
    # volledige 82 MB ná het afbreken en gooide 'm weg → verspilde proxy-egress). timeout_seconds=None
    # => geen deadline (backward-compat).
    overall_deadline = (time.time() + timeout_seconds) if timeout_seconds else None
    _last_progress_write = [0.0]  # mutable cel voor de throttle-timestamp (closure)

    # Vroege-screening state (ADR-095), per-poging gezet in de loop via mutable cellen (de hook is
    # één keer gedefinieerd maar gedeeld over pogingen). _screen_vnorm[0] > 0 → screening actief voor
    # deze poging (alleen niet-laatste pogingen). _first_byte_t[0] = tijd van het eerste gedownloade
    # byte (throughput wordt vanaf DAAR gemeten, niet vanaf metadata-extractie → geen valse afkeuring
    # van een snelle exit met trage metadata).
    _screen_vnorm = [0.0]
    _first_byte_t = [0.0]

    def _deadline_hook(status) -> None:
        # Alleen tijdens actief downloaden — nooit een zojuist voltooide download ('finished')
        # weggooien omdat de deadline net verstreek.
        if status.get('status') != 'downloading':
            return
        now = time.time()
        if overall_deadline is not None and now > overall_deadline:
            raise DownloadCancelled(
                f"download timed out after {timeout_seconds:.0f}s derived budget"
            )
        # Vroege snelheidsscreening (ADR-095): breek een te traag gepind exit-IP vroeg af (goedkoop)
        # i.p.v. het uit te zitten tot de deadline. Vloer beweegt mee met de voortgang:
        # v_floor(p) = v_norm·(1−p)/(1+p) — hoog bij p≈0 (afbreken bijna gratis), → 0 bij p→1 (nooit
        # afbreken vlak voor het einde). Meet de doorvoer vanaf het eerste byte; screen pas na een
        # stabiel sample (SCREEN_MIN_SAMPLE_SECONDS). Alleen als het totaal bekend is (p nodig).
        vnorm = _screen_vnorm[0]
        if vnorm > 0:
            downloaded = status.get('downloaded_bytes') or 0
            total = status.get('total_bytes') or status.get('total_bytes_estimate') or 0
            if downloaded > 0 and _first_byte_t[0] == 0.0:
                _first_byte_t[0] = now
            dl_elapsed = now - _first_byte_t[0] if _first_byte_t[0] > 0 else 0.0
            if dl_elapsed >= SCREEN_MIN_SAMPLE_SECONDS and downloaded > 0 and total > 0 and downloaded < total:
                v = downloaded / dl_elapsed
                p = downloaded / total
                v_floor = vnorm * (1 - p) / (1 + p)
                if v < v_floor:
                    raise SlowExitScreened(
                        f"slow exit screened: v={v:.0f}B/s < floor={v_floor:.0f}B/s at p={p:.3f}",
                        throughput=v, progress=p, elapsed=dl_elapsed,
                    )
        # Point 2: gethrottlede voortgang naar de DB. Totaal = wat yt-dlp zélf rapporteert (exact
        # total_bytes, anders zijn eigen total_bytes_estimate — dezelfde waarde als in yt-dlp's
        # "X% of 82MiB"-regel). Kent yt-dlp het totaal niet, dan schrijven we NIETS → beide kolommen
        # blijven NULL en de frontend valt terug op een onbepaalde balk (geen gok van onze kant).
        if progress_cb is not None and (now - _last_progress_write[0]) >= DOWNLOAD_PROGRESS_INTERVAL:
            downloaded = status.get('downloaded_bytes')
            total = status.get('total_bytes') or status.get('total_bytes_estimate')
            if downloaded and total:
                _last_progress_write[0] = now
                try:
                    progress_cb(int(downloaded), int(total))
                except Exception:
                    pass  # voortgang schrijven mag de download NOOIT breken

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
    # Fix 1: vraag een KLEIN audioformaat op i.p.v. bestaudio. We transcoderen sowieso naar 12 kbps
    # mono opus voordat het naar AssemblyAI gaat (zie ffmpeg hieronder), dus de brontbitrate boven ~48k
    # is verspilde egress: een 76-min video is 82 MB als bestaudio maar ~30-40 MB bij ~48-70 kbps, met
    # een IDENTIEK 12 kbps-eindresultaat. Fallback-keten, geen harde keuze — zakt netjes terug zodat een
    # video die nu lukt nooit kan gaan falen: eerst ≤70k, dan ≤128k, dan bestaudio, dan best.
    base_ydl_opts = {
        'format': 'bestaudio[abr<=70]/bestaudio[abr<=128]/bestaudio/best',
        'outtmpl': f"{base_output_path}.%(ext)s",
        'quiet': True,
        'no_warnings': True,
        'verbose': False,
        'socket_timeout': 120,
        'retries': 3,
        'extractor_retries': 3,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},
        'progress_hooks': [_deadline_hook],  # Fix 3: breekt de download echt af op de deadline
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

    # Meet-instrumentatie: per-job aggregaat (geen gedragswijziging). total_download_ms = som van de
    # ACTIEVE poging-duren (excl. retry-backoff sleep); job_attempts = aantal daadwerkelijk gestarte
    # pogingen; _summary_sent bewaakt dat summary_cb precies één keer vuurt.
    total_download_ms = 0
    job_attempts = 0
    _summary_sent = [False]

    def _log_attempt(attempt_no: int, session: str, attempt_bytes: int, duration_ms: int, outcome: str, detail: str = "") -> None:
        tp = (attempt_bytes / (duration_ms / 1000.0) / 1e6) if duration_ms > 0 else 0.0
        extra = f" {detail}" if detail else ""
        logger.info(
            f"[YT-DLP-AUDIO-ATTEMPT] video={video_id} attempt={attempt_no}/{max_attempts} "
            f"session={session} bytes={attempt_bytes} duration_ms={duration_ms} "
            f"throughput_mb_s={tp:.3f} outcome={outcome}{extra}"
        )

    def _emit_summary(final_outcome: str, compress_ms: int = 0) -> None:
        if _summary_sent[0]:
            return
        _summary_sent[0] = True
        avg = (cumulative_bytes / (total_download_ms / 1000.0) / 1e6) if total_download_ms > 0 else 0.0
        logger.info(
            f"[YT-DLP-AUDIO-SUMMARY] video={video_id} attempts={job_attempts} "
            f"egress_bytes={cumulative_bytes} download_ms={total_download_ms} compress_ms={compress_ms} "
            f"avg_throughput_mb_s={avg:.3f} redownload={'yes' if job_attempts > 1 else 'no'} "
            f"outcome={final_outcome}"
        )
        if summary_cb is not None:
            try:
                summary_cb(total_download_ms, job_attempts, compress_ms)
            except Exception:
                pass  # meten mag de download/uitkomst NOOIT beïnvloeden

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
        # Fix 2/3: geen verse poging meer starten als de afgeleide wall-clock-deadline al verstreken is.
        if overall_deadline is not None and time.time() > overall_deadline:
            last_error = TimeoutError(f"download timed out after {timeout_seconds:.0f}s derived budget")
            break
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
        job_attempts = attempt
        session = _proxy_session_id(attempt_proxy)
        attempt_started = time.time()
        # Vroege screening AAN voor deze poging alleen als er een v_norm is én dit NIET de laatste
        # poging is (ADR-095: de laatste poging screent niet meer — dan is er geen verse sessie meer
        # om naar over te stappen, dus uitzitten is beter dan falen). Reset de eerste-byte-timer.
        _screen_vnorm[0] = float(screen_normal_bytes_per_sec) if (screen_normal_bytes_per_sec and attempt < max_attempts) else 0.0
        _first_byte_t[0] = 0.0

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
            # Meet: downloadduur van DEZE poging = tot het rauwe bestand binnen is (vóór ffmpeg —
            # transcodering is geen download en hoort niet in de throughput). Excl. retry-backoff.
            attempt_ms = int((time.time() - attempt_started) * 1000)
            total_download_ms += attempt_ms
            _log_attempt(attempt, session, raw_size_bytes, attempt_ms, 'success')
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
            _compress_started = time.time()  # ADR-096: meet de transcode-fase (ruw→opus) apart
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                raise Exception(f"ffmpeg failed: {result.stderr[-500:]}")
            compress_ms = int((time.time() - _compress_started) * 1000)

            os.remove(raw_path)

            final_size = os.path.getsize(final_output_path) / 1024 / 1024
            logger.info(f"[YT-DLP-AUDIO] conversion done: {raw_size:.2f}MB → {final_size:.2f}MB ogg ({compress_ms}ms)")

            _emit_summary('success', compress_ms)
            return final_output_path, video_title, channel, cumulative_bytes

        except SlowExitScreened as e:
            # ADR-095: vroege screening brak een te traag exit-IP af. Er is per definitie nog een
            # poging over (screening staat uit op de laatste poging) → RETRY met een verse sessie;
            # dit mag NOOIT de job doen falen. Egress van de partial telt mee (was echte proxy-kost).
            attempt_ms = int(e.elapsed * 1000) if e.elapsed else int((time.time() - attempt_started) * 1000)
            total_download_ms += attempt_ms
            partial = _measure_partial_egress()
            cumulative_bytes += partial
            _log_attempt(
                attempt, session, partial, attempt_ms, 'screen_abort',
                detail=f"screen_throughput_mb_s={e.throughput / 1e6:.3f} screen_at_progress={e.progress:.3f}",
            )
            last_error = Exception(
                f"slow-exit screened at p={e.progress:.3f} (v={e.throughput / 1e6:.3f} MB/s)"
            )
            delay = 2 ** attempt  # 2s, 4s — zelfde backoff als de andere retryable uitkomsten
            logger.warning(
                f"[YT-DLP-AUDIO screen-retry={attempt}/{max_attempts} video={video_id}] "
                f"traag exit-IP (v={e.throughput / 1e6:.3f} MB/s bij p={e.progress:.2f}), "
                f"verse sessie over {delay}s"
            )
            time.sleep(delay)
            continue

        except DownloadCancelled as e:
            # Fix 3: de deadline-hook brak de download af. Budget is op — NIET retryen (een verse
            # poging zou de deadline sowieso direct weer overschrijden). Egress van de partial telt mee.
            attempt_ms = int((time.time() - attempt_started) * 1000)
            total_download_ms += attempt_ms
            partial = _measure_partial_egress()
            cumulative_bytes += partial
            _log_attempt(attempt, session, partial, attempt_ms, 'deadline')
            last_error = TimeoutError(f"download timed out after {timeout_seconds:.0f}s derived budget")
            logger.warning(f"[YT-DLP-AUDIO deadline-abort attempt={attempt} video={video_id}] {e}")
            _emit_summary('deadline')
            break

        except Exception as e:
            attempt_ms = int((time.time() - attempt_started) * 1000)
            total_download_ms += attempt_ms
            last_error = e
            error_str = str(e).lower()
            # BLOK C: reken de egress van DEZE mislukte poging mee (partial download op disk).
            partial = _measure_partial_egress()
            cumulative_bytes += partial

            if any(kw in error_str for kw in MEMBERS_ONLY_KEYWORDS):
                _log_attempt(attempt, session, partial, attempt_ms, 'members_only')
                logger.warning(f"[YT-DLP-AUDIO] members-only detected: {video_id}")
                _emit_summary('members_only')
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
            reason = 'partial_write' if is_partial_write else ('timeout' if is_timeout else ('connection' if is_connection else 'other'))
            _log_attempt(attempt, session, partial, attempt_ms, reason)

            if (is_partial_write or is_timeout or is_connection) and attempt < max_attempts:
                delay = 2 ** attempt  # 2s, 4s
                logger.warning(
                    f"[YT-DLP-AUDIO retry={attempt}/{max_attempts} reason={reason} video={video_id}] "
                    f"retrying in {delay}s with fresh proxy session"
                )
                time.sleep(delay)
            else:
                break

    logger.error(f"[YT-DLP-AUDIO final_fail attempts={attempt} video={video_id} egress={cumulative_bytes}B] {last_error}")
    _emit_summary('failed')  # no-op als een eerdere tak 'm al stuurde (deadline/members_only)
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


def compress_audio_if_needed(file_path: str, output_dir: str = "/tmp", force: bool = False) -> str:
    """
    Extract mono Opus/OGG audio via ffmpeg. Returns a new path, or the original unchanged when no
    work is needed.

    Two callers:
      - size path (force=False): only runs when the file exceeds MAX_FILE_SIZE_BYTES. NB: uploads are
        already capped at that same size, so on the upload path this branch is effectively a no-op —
        the real work below is driven by `force`.
      - provider-transcode path (force=True): the pipeline sets this for containers AssemblyAI won't
        accept raw (AVI/MKV), so the audio is extracted regardless of size. Same ffmpeg command; -vn
        strips any video track.

    Args:
        file_path: Path to audio/video file
        output_dir: Directory for the extracted file
        force: Run the extraction regardless of file size (used for AVI/MKV)

    Returns:
        Path to the extracted file (or the original if no work was needed)

    Raises:
        Exception: If extraction fails
    """
    file_size = os.path.getsize(file_path)

    if not force and file_size <= MAX_FILE_SIZE_BYTES:
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
