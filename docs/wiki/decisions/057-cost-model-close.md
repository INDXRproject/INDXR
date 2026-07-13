# Beslissing 057: Money-model sluiten — capture/berekening-gaten dicht (Blok A–F)

**Status:** Geaccepteerd
**Datum:** 2026-07-14
**Gerelateerde code:** `backend/main.py` (caption-endpoint + `_log_caption_event` + `_compute_playlist_reservation`), `backend/worker.py` (`_process_caption_video` + `_log_caption_event`), `backend/audio_utils.py` (`extract_youtube_audio`), `backend/transcription_pipeline.py` (download-except), `apps/app/src/app/admin/adminTypes.ts` + `finance/FinanceView.tsx`, migraties `20260713222920` (usage_logs), `20260713223654` (R2-rate), `20260713223907` (geld-RPC split+storage).

## Context

De capture-audit (bovenop ADR-054/055) toonde dat het money-model **niet sloot**: meerdere lekken waardoor gemeten kost niet één-op-één in de P&L-regels viel, plus één euro die dubbel geteld werd. Deze ADR legt de zes fixes vast die het model laten sluiten (geverifieerde sluit-test onderaan). Kernprincipe: **nergens afronden in de capture/berekening-backend** — rauwe bytes/tokens, tarieven numeriek; afronden alleen bij weergave.

## Beslissing

**Blok A — Per-caption event-rij voor INGELOGDE users.** Elke caption door een ingelogde user (standalone `main.py` én playlist `worker.py`) schrijft één `usage_logs`-rij via `log_caption_usage` (SECURITY DEFINER, service_role-only): `user_id`, `video_id`, `proxy_bytes` (volle precisie), `had_paid_at_time` (snapshot: had de user ≥1 aankoop op dat moment), `is_internal_at_time` (snapshot), `cache_hit`, `credits_used` (0 gratis / 1 betaalde playlist-caption), `success`. Snapshots worden server-side in de RPC berekend. **Anoniem** (geen `user_id`) → géén per-rij; die tellen in `daily_cost_counters` (aggregaat, free-funnel-OPEX). Anonieme caption-video-types worden **niet** apart bewaard — bewust weggegooid (alleen count + bytes in de dagteller), akkoord bevonden.

**Blok B — Egress op mislukte jobs.** Vroeger schreef de pipeline `proxy_bytes` pas ná een geslaagde download (25/25 error-jobs = 0 bytes). Nu hangt `audio_utils` de gesommeerde egress op de exception (`final_err.proxy_bytes`) en persisteert de pipeline die op de mislukte job (ook members-only-tak).

**Blok C — Som van alle retry-pogingen.** `extract_youtube_audio` telt de Decodo-egress van **álle** pogingen op (niet enkel de geslaagde): een mislukte poging trok al bytes over de proxy (partial download) → gemeten op disk vóór de cleanup van de volgende poging.

**Blok D — Caption dubbeltelling opgeheven.** `daily_cost_counters` bevat sinds Blok A **uitsluitend anonieme** captions. De geld-RPC berekent caption-COR nu uit **echte** gemeten `usage_logs`-egress (`credits_used>0`), niet meer geschat uit de dagteller × verbruikte caption-credits. Gratis ingelogde captions (`credits_used=0`) = free-funnel-OPEX per scope. Cache-hits hebben `proxy_bytes=0` → tellen $0 (geen cache-hit-overcounting meer). `cor_caption_estimated=false`.

**Blok E — Storage-COR (R2) als eigen regel.** `cost_config` +`r2_usd_per_gb_month` ($0,015) +`r2_free_gb` (10). Storage-COR = `max(0, GB − 10) × $0,015 × usd_eur_rate`. Free tier is **account-globaal** → één globale COR-regel op de externe footprint (`user_credits.library_bytes`). R2-egress is altijd €0. Nu ~€0 (extern 122 KB « 10 GB; de ~0,2 GB is intern/test, uitgesloten).

**Blok F — Playlist-kostlogica (bevestigd + gedocumenteerd).** Voor een **AI-transcriptie**-video in een playlist vervalt de vlakke 1-credit playlist-kost: de video wordt **per minuut** belast (`calculate_credit_cost` = `ceil(duration/60)`, altijd ≥1), zónder gratis-3-korting (`worker.py` negeert `is_free` in de whisper-branch). Een **caption**-video kost 1 credit (gratis bij `index<3 and not is_retry`). Caption- en whisper-stromen zijn **per video wederzijds exclusief** (bepaald door `use_whisper_ids`-lidmaatschap) → DB-overlap = 0 (structureel gegarandeerd). `_compute_playlist_reservation` mirrort dit exact (reserve == settle).

## Rationale

- **Eén bron per euro.** Elke gemeten kost-eenheid (whisper-egress, caption-egress, AssemblyAI-minuten, DeepSeek-tokens, R2-GB) landt in exact één P&L-regel. De oude schatting gebruikte de dagteller-egress twee keer (als funnel-OPEX én als COR-basis) en paste 'm toe op álle credits incl. cache-hits → structurele over/dubbeltelling.
- **Snapshots in de RPC** (niet in de backend) houden `had_paid`/`is_internal` auditeerbaar en atomair op het extractie-moment.
- **Rauwe precisie** overal in capture: `bigint` bytes, `numeric` tarieven; afronden alleen in `FinanceView`.
- SECURITY DEFINER + `REVOKE anon, authenticated` + `GRANT service_role` op elke nieuwe RPC (LESSON 2026-07-13: Supabase auto-grant).

## Consequenties

- Segmenten ontsloten: free-loggedin / paid-after / paid-caption (via `had_paid_at_time` + `credits_used`), intern/extern (`is_internal_at_time`), cache-hit vs miss.
- `daily_cost_counters` is nu semantisch "anonieme caption-funnel". De 8 historische rijen (pre-Blok-A) kunnen ingelogde captions bevatten — eenmalig artefact, vooruit is de split schoon.
- Storage-COR-regel bestaat en is future-proof; nu €0, hoge marge.

## Sluit-test (geverifieerd 2026-07-14, productie-data)

Decodo-egress partitioneert exact — geen gat, geen overlap:

| Bucket | Bytes |
|--------|-------|
| whisper intern (`transcription_jobs`, incl. mislukt na Blok B) | 15.392.032 |
| whisper extern | 0 |
| caption-COR intern/extern (`usage_logs`, `credits_used>0`) | 0 (usage_logs nog leeg) |
| caption-funnel ingelogd intern/extern (`usage_logs`, `credits_used=0`) | 0 |
| caption-funnel anoniem globaal (`daily_cost_counters`) | 9.285.389 |
| **Som van buckets** | **24.677.421** |
| **Onafhankelijk totaal** (Σ alle 3 tabellen) | **24.677.421** |

Som = onafhankelijk totaal → **het model sluit**. Overige gemeten stromen (AssemblyAI-minuten, DeepSeek-tokens, R2-GB) zijn aparte niet-Decodo streams, elk in exact één COR-regel.
