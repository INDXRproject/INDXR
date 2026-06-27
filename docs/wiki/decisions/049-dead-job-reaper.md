# Beslissing 049: Dead-job reaper voor transcription_jobs

**Status:** Geaccepteerd  
**Datum:** 2026-06-27  
**Gerelateerde code:** `backend/worker.py` (`watchdog_interrupted_jobs`), `backend/main.py` (dedup-check)

## Context

Na het implementeren van dedup-bescherming (commit 35cc184) voor single-video AI-transcriptie bleek dat de dedup-check `transcription_jobs` filterde op actieve statussen (`pending/downloading/transcribing/saving`) zonder rekening te houden met jobs die die status nooit netjes verlaten hebben.

**Oorzaak van stuck jobs:**
- Railway-restart vóór ARQ de job oppikt → job blijft in `pending`, `last_heartbeat_at = NULL`
- Worker-crash tijdens download/transcriptie → job blijft in actieve status, `last_heartbeat_at` stale

**Geen bestaand mechanisme:** De watchdog (ADR-030) keek alleen naar `status='interrupted'`. De stale-detectie in `get_job_status` keek naar `status='running'` — een status die `transcription_jobs` nooit gebruikt. Stuck jobs in `pending/downloading/transcribing/saving` werden nooit gesloten.

**Gevolg (geobserveerd in productie):** Een stuck `transcription_jobs`-rij voor video `BEWz4SXfyCQ` blokkeerde een nieuwe aanvraag (inclusief master-cache-hit) omdat de dedup-check haar als "actief" telde. De gebruiker zag een spookjob die eeuwig op "queued" stond.

**Bredere eis:** Khidr wil `transcription_jobs` als databron voor video/kanaal-analyse (productfocus, Google Ads-targeting). Stuck rijen in actieve status vervuilen die analyse.

## Beslissing

**Optie (b): Reaper — terminale status zetten.** Stuck jobs worden niet genegeerd (optie a: tijdsfilter only) en niet verwijderd (optie c), maar naar een terminale status gebracht.

Geïmplementeerd als **Pass 0** in de bestaande `watchdog_interrupted_jobs` ARQ-cron (elke 2 min):

**Pass 0a — Stuck pending (ARQ pickup gemist):**
- `status = 'pending'` AND `last_heartbeat_at IS NULL` AND `created_at < NOW() - 30min`
- `credits_deducted=False` → `status='error'` (nooit begonnen, geen herstart nodig)
- `credits_deducted=True` → `status='interrupted'` (Pass 1a hervatten)

**Pass 0b — Crashed active (standalone job, heartbeat stale):**
- `status IN ('downloading','transcribing','saving')` AND `last_heartbeat_at IS NOT NULL` AND `last_heartbeat_at < NOW() - 10min`
- `credits_deducted=False` → `status='error'`
- `credits_deducted=True` → `status='interrupted'` (Pass 1a hervatten)

**Defense-in-depth:** OR-tijdsfilter op de dedup-check in `main.py` (`created_at > 30min geleden OR last_heartbeat_at > 10min geleden`) zodat stuck jobs ook in het 2-minuten reaper-venster de dedup niet blokkeren.

## Rationale

**Industry standard:** Sidekiq (Ruby), solid_queue (Rails), BullMQ (Node.js), Celery (Python) lossen stuck jobs allemaal op via een Reaper/Sweeper die periodiek heartbeat-stale jobs naar een terminale status brengt ("DeadSet", "failed"). Geen van deze systemen verwijdert stuck rijen — ze bewaren de audit trail. Hard deletion is alleen passend voor completed/success rijen na een retentietermijn.

**Playlist-veiligheid (kritiek, geverifieerd):** Playlist-Whisper-video's maken wél `transcription_jobs`-rijen aan (worker.py:454), maar hun heartbeat schrijft naar `playlist_extraction_jobs` (worker.py:440-445), NOOIT naar `transcription_jobs.last_heartbeat_at`. Dit betekent dat actieve playlist-video-jobs altijd `last_heartbeat_at = NULL` hebben op `transcription_jobs`.

Pass 0a raapt alleen `status='pending'` — playlist-jobs verlaten pending binnen seconden.  
Pass 0b vereist `last_heartbeat_at IS NOT NULL` — playlist-jobs zijn per definitie uitgesloten.  
Jobs met `status IN ('downloading','transcribing','saving')` en `last_heartbeat_at IS NULL` worden **nooit gereapt**.

**Heartbeat-betrouwbaarheid (geverifieerd):** Alle blocking operaties in `transcription_pipeline.py` zijn `asyncio.to_thread` (yt-dlp:194, ffmpeg:289, AssemblyAI:307) — blokkeren de event loop niet, heartbeat-loop tikt door. Heartbeat-loze gap tussen download en AssemblyAI (stap 2-5) is max enkele minuten, ruim binnen 10-minuten stale-drempel.

**Drempel-keuze:**
- Pending: 30 min (ARQ pikt normaliter in seconden op; 30 min = absoluut dood zonder ARQ)
- Actief stale: 10 min bij 60s interval = 9 gemiste beats, conservatief genoeg voor incidentele event-loop hiccups en ffmpeg-gaps

## Consequenties

- Stuck jobs worden automatisch gesloten binnen 2 min na detectie — geen handmatige SQL-cleanup nodig
- `transcription_jobs` bevat geen eeuwige "actieve" rijen meer → schone databron voor analyse
- Credits die vóór een crash werden afgetrokken (`credits_deducted=True`) worden herstart via Pass 1a
- Credits die nooit werden afgetrokken (`credits_deducted=False`) worden niet teruggestort (job nooit gestart)
- Sentry-capture bij elke reaper-transitie (conform bestaand watchdog-patroon)
- Nieuwe dependency: `timedelta` import in `main.py` (toegevoegd naast bestaande `datetime, timezone`)
