# Beslissing 092: Meetlaag voor YouTube-audio-download-doorvoer (meten, nog niet ingrijpen)

**Status:** Geaccepteerd
**Datum:** 2026-08-09
**Gerelateerde code:** `backend/audio_utils.py` (`extract_youtube_audio`), `backend/transcription_pipeline.py` (`_write_dl_summary`), migratie `20260809120000_download_metrics_columns.sql`

## Context

Onderzoek in een eerdere sessie concludeerde over trage YouTube-audio-downloads:
- de traagheid komt **niet** van het Decodo-tegoed maar van de **kwaliteit van het gepinde exit-IP**;
- er is **geen doorvoerondergrens** — een trage node wordt uitgezeten tot de klokdeadline;
- een **mislukte poging downloadt het bestand volledig opnieuw**. Eén job in de data deed **288 MB
  egress voor 96 MB audio** = drie volledige downloads.

Die her-download-kost is nu **onzichtbaar**: `proxy_bytes` (cumulatieve egress) stond er wel, maar
doorvoer en her-download-versterking waren alleen te benaderen via tijdstempels (`started_at` →
`completed_at`, die óók de transcriptie-poll en wachttijd bevatten). **Beslissing: eerst meten, dan
pas beslissen** — deze taak wijzigt bewust GEEN downloadgedrag (geen doorvoerondergrens, geen vroege
rotatie, geen wijziging aan het aantal pogingen of aan de formaatkeuze).

## Beslissing

**Per-poging gestructureerde log** in `extract_youtube_audio` (één regel per download-poging):
```
[YT-DLP-AUDIO-ATTEMPT] video=<id> attempt=<n>/<max> session=<sid> bytes=<b> duration_ms=<ms> throughput_mb_s=<x.xxx> outcome=<success|partial_write|timeout|connection|deadline|members_only|other>
```
Het **session-id** is niet geheim en wordt gelogd (`<PROXY_SESSION>-r<n>`); het **wachtwoord blijft
altijd gemaskeerd** (nergens gelogd — de bestaande regel toont enkel `@host:port`). De poging-duur is
de **actieve download-tijd** (tot het rauwe bestand binnen is, vóór ffmpeg), niet inclusief
retry-backoff of transcodering. `bytes` = de download van die poging (succes = volledig bestand;
mislukt = partial egress op disk).

**Per-job samenvatting**:
```
[YT-DLP-AUDIO-SUMMARY] video=<id> attempts=<n> egress_bytes=<cumulatief> download_ms=<som actieve duren> avg_throughput_mb_s=<x.xxx> redownload=<yes|no> outcome=<final>
```

**Twee nieuwe kolommen op `transcription_jobs`** (gevuld via `summary_cb` op élk eindpunt, succes én
mislukking — mislukte multi-poging-jobs zijn juist de dure):
- `download_ms` — som van de actieve poging-download-duren (ms), excl. backoff en ffmpeg.
- `download_attempts` — aantal gestarte pogingen (>1 = her-download).

Hiermee is **doorvoer** = `proxy_bytes / (download_ms/1000)` en **her-download-versterking** =
`proxy_bytes / download_total_bytes` (cumulatieve egress vs één volledig bestand) **direct queryebaar**
i.p.v. via een tijdstempel-benadering. Forward-only: bestaande rijen blijven NULL (geen backfill).

**Rapportquery — de nu-zichtbare kostenpost** (jobs die >1 volledige poging nodig hadden + extra egress):
```sql
SELECT
  count(*) FILTER (WHERE download_attempts > 1)                                  AS jobs_multi_attempt,
  count(*) FILTER (WHERE download_attempts >= 1)                                 AS jobs_measured,
  COALESCE(sum(GREATEST(proxy_bytes - COALESCE(download_total_bytes,0),0))
           FILTER (WHERE download_attempts > 1),0)                              AS extra_egress_bytes
FROM public.transcription_jobs WHERE download_attempts IS NOT NULL;
```
Extra egress × `cost_config.decodo_eur_per_gb` = de her-download-kost die op de kostprijs per
transcriptie drukt.

## Rationale

- **Meten vóór ingrijpen**: de fix-keuze (doorvoerondergrens vs vroege rotatie vs formaat) hangt af
  van de verdeling van doorvoer en her-download-frequentie; die data bestond niet expliciet.
- **`summary_cb` i.p.v. de returnwaarde uitbreiden**: houdt `audio_utils` DB-agnostisch (spiegelt het
  bestaande `progress_cb`-patroon) en breekt de bestaande 4-tuple-return NIET → geen wijziging aan de
  unit-tests of andere callers.
- **Actieve download-tijd (vóór ffmpeg), backoff uitgesloten**: geeft de échte transfer-doorvoer, niet
  vervuild door transcodering of retry-slaaptijd.

## Consequenties

- Geen gedragswijziging aan de download; puur observability. Geen extra proxy-verkeer.
- `download_ms`/`download_attempts` zijn NULL voor pre-2026-08-09-jobs → queries filteren op
  `download_attempts IS NOT NULL`.
- Volgende stap (aparte beslissing, op basis van deze meting): wel/niet een doorvoerondergrens of
  vroege rotatie invoeren.

## Verificatie (2026-08-09)

Echte transcriptie van een **ondertitelloze** YouTube-video (`m2-cn2iHvbA`, 62s Arabische spraak — nul
subtitles/auto-captions geverifieerd → AI-pad), via de echte Decodo-proxy + echte AssemblyAI:
- Logregel: `[YT-DLP-AUDIO-ATTEMPT] video=m2-cn2iHvbA attempt=1/3 session=c72cec78-r1 bytes=908044 duration_ms=192068 throughput_mb_s=0.005 outcome=success` + bijbehorende `[YT-DLP-AUDIO-SUMMARY]`.
- Gevulde kolommen: `download_ms=192068, download_attempts=1, proxy_bytes=908044, download_total_bytes=908044` → **throughput 0,0047 MB/s** (≈5 KB/s). Transcriptie: 9 segmenten, `universal-3-5-pro`.
- Dit ving meteen het gerapporteerde patroon: 0,9 MB die **192 s** duurde op een traag exit-IP,
  uitgezeten zonder ondergrens. Rapportquery draait; `jobs_multi_attempt=0` (forward-only, nog maar 1
  gemeten job) — accumuleert vanaf nu in productie.
- 11/11 bestaande audio-tests groen (geen gedragswijziging); `py_compile` schoon.
