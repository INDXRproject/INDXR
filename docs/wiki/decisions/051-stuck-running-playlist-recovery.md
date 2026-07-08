# Beslissing 051: Stuck-running-playlist recovery (per-video timeout + reap-pass)

**Status:** Geaccepteerd
**Datum:** 2026-07-09
**Gerelateerde code:** `backend/transcription_pipeline.py` (`_run_with_heartbeat` timeout), `backend/worker.py` (`_should_reap_running_playlist`, `_reap_stale_running_playlist`, watchdog Pass 3 + Pass 1b bounded), `backend/main.py` (caption-cap), `backend/test_stuck_playlist_fix.py`

## Context
Een playlist bleef in productie hangen op "19/28 · running" (job `bfd1d7ed`, user T): één yt-dlp
read-timeout blokkeerde de sequentiële keten. Diagnose: een `status='running'` playlist met NULL/stale
heartbeat is **onzichtbaar voor elk recovery-pad** — de poll-endpoint flipt `running`→`interrupted`
alléén bij aanwezige heartbeat (`main.py:1257`); géén watchdog-pass query't `running`; Pass 1b is
one-shot (`watchdog_attempts=0`). Bewijs dat dit structureel is: een **71-dagen** oude `running`
playlist (`0ad1c75c`) was nooit gereapt. De ARQ `job_timeout` (2u) is de enige bovengrens per video.

## Beslissing
Vier chirurgische ingrepen, gebouwd op de bestaande refund-primitieven (geen nieuwe geld-logica):

1. **Per-video download-timeout (preventie).** `_run_with_heartbeat` krijgt een `timeout=`-param
   (`asyncio.wait_for`). Toegepast op de yt-dlp/caption-EXTRACTIE-stap (caption cascade + whisper
   audio-download), **NIET** op de AssemblyAI-poll. Op timeout: `TimeoutError("... timed out ...")`
   → bestaande `_classify_download_error` → retryable `'timeout'` → bestaand error→refund→retry-pad.
   Waarden: caption 120s, audio-download 600s.
2. **Watchdog reap van stale `running` playlists (vangnet).** Nieuwe Pass 3. Detectie
   (`_should_reap_running_playlist`): VOORTGANG stale (`COALESCE(last_progress_at, created_at)` ≥25min)
   ÉN heartbeat stale (NULL of ≥5min). Actie: refund-VÓÓR-terminal-claim (`refund_credits`, idempotent
   via `(playlist_id,'refund')`; skip bij reserved 0/NULL), onverwerkte video's → `'timeout'`
   (retryable), CAS-claim `status='complete'` op `.eq('status','running')`. NIET auto-re-enqueuen.
3. **Pass 1b bounded** (`watchdog_attempts < 3` i.p.v. `= 0`), CAS op de gelezen attempts-waarde.
4. **Caption-cap** op `/api/extract/youtube` — alléén voor geauthenticeerde callers (user_id present);
   anon marketing-traffic ongewijzigd (IP-rate-limited).

## Rationale
- **Detectie op VOORTGANG, niet heartbeat-aanwezigheid.** Een vers-gestarte playlist heeft legitiem
  NULL heartbeat → mag nooit gereapt worden; de `created_at`-fallback beschermt 'm. De heartbeat-stale
  conditie is een *protectieve guard* (geen trigger): een trage-maar-levende whisper-video (heartbeat
  elke 60s vers) wordt niet gereapt.
- **Money-loss-window dicht.** Refund-vóór-claim + idempotentie + de heartbeat-guard: een heartbeat
  ≥5min stale betekent (met de per-video-timeout) een dóde worker → geen latere settlement na de refund.
  Een levende worker (verse heartbeat) wordt nooit gereapt, dus geen refund terwijl er nog gesetteld
  wordt. Geverifieerd tegen de 3 vastgelopen jobs (dry-run: `bfd1d7ed` refund 9, twee 0-reserved zombies
  skip refund).
- **Hergebruik, geen nieuwe geld-paden.** Alle refunds via `refund_credits`/`(playlist_id,'refund')`;
  Pass 2c-reconciliatie blijft het residuele vangnet.

## Consequenties
- Een hangende video faalt nu binnen minuten (`'timeout'`) i.p.v. de keten tot 2u te blokkeren; de
  gebruiker retryt via de bestaande Retry-all.
- Een echt-vastgelopen `running` playlist wordt binnen ~25–30min gereapt, gerefund en terminaal
  gemarkeerd (Final Summary + retry UX). De 3 bestaande zombies worden automatisch door de cron opgevangen.
- De onderliggende yt-dlp bot-detectie/read-timeout-frequentie is NIET opgelost (aparte proxy-reliability
  track, priorities 1.27) — deze beslissing maakt hangs onschadelijk/herstelbaar.
