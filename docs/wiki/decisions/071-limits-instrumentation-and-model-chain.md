# Beslissing 071: Limieten (duur/playlist/channel), caption-latency-instrumentatie & model-chain-opschoning

**Status:** Geaccepteerd
**Datum:** 2026-07-22
**Gerelateerde code:** `backend/main.py` (whisper- + playlist-extract-endpoints, `_log_caption_event`), `backend/assemblyai_client.py`, `packages/shared/src/utils/youtube.ts`, `apps/app/src/app/api/playlist/extract/route.ts`, frontend `PlaylistManager`/`VideoTab`/`AudioTab`, migratie `20260722115615_caption_latency.sql`

## Context

De docs-pagina's *overview* + *limits* mogen geen ongefundeerde of onafgedwongen getallen noemen. Een read-only audit (product-truth §6, ADR-onafhankelijk) legde bloot: geen caption-latency-meting, geen duur-cap, playlist-cap alleen bij enumeratie (extractie onbegrensd), channel-URL's vielen door als "malformed", en een model-chain-lid dat nooit geselecteerd kon worden.

**DEEL 0 — meetdata (bepaalt de waarschuwingsdrempel).** De grote JRE-testrun (`playlist_extraction_jobs.id=c23cc227`, 2026-07-05): **462 video's, 449 geslaagd / 13 mislukt (97,2%)**, **doorlooptijd 81,4 min** (`processing_time_seconds=4884` ≈ **~10,6 s/video**, auto-captions), **1 watchdog-interventie** maar schoon afgerond. **Proxy-egress: niet gemeten** (playlist-caption-pad schrijft geen `usage_logs`; predateert de F18-proxy-instrumentatie van 2026-07-16). **Geen jobs blijvend in 'running'.**

## Beslissing

**DEEL 1 — Caption-latency-instrumentatie.** Nieuwe kolom `usage_logs.duration_ms` (server-side gemeten extractie-latency, cache-hit én miss) + `log_caption_usage`-RPC uitgebreid met `p_duration_ms`. `_log_caption_event` meet vanaf handler-start (`time.monotonic()`) tot elk log-punt. Geen PII. Backend-only RPC (service_role; anon/authenticated REVOKE'd).

**DEEL 2 — Duur-cap 10 uur.** AI-transcriptie boven **10 uur** (`MAX_TRANSCRIPTION_SECONDS=36000`) wordt geweigerd (**422 `duration_exceeds_max`**) **vóór** enige credit-reservering, voor YouTube én uploads. Caption-extractie krijgt géén duur-cap. AssemblyAI's 5 GB-limiet is gedekt door de 500 MB-upload-cap + deze 10h-cap.

**DEEL 3 — Playlist-cap 500 + waarschuwing.** `MAX_PLAYLIST_VIDEOS=500` afgedwongen op de extract-route (backend **422 `too_many_videos`** vóór job-rij + reservering; Next.js Zod `.max(500)` als snelle client-gate). Niet-blokkerende **waarschuwing vanaf 50 geselecteerde video's**: "duurt ~M min; je kunt de tab sluiten".
- **Drempel = 50 video's, motivering:** bij de gemeten ~10,6 s/video (DEEL 0) is 50 video's ≈ **9 min** — het punt waarop in-tab wachten hinderlijk wordt en "tab sluiten" echt nuttig is. Het is 5× de default-selectie (10) en 10% van de harde cap (500), dus de waarschuwing vuurt alleen bij duidelijk grote jobs zonder typische jobs te storen. Schatting in de melding: `M = max(1, round(N × 11 / 60))`.

**DEEL 4 — Channel-URL-detectie.** `validateYouTubeUrl` kent nu type `CHANNEL` (`/@handle`, `/channel/`, `/c/`, `/user/`); frontend toont een bruikbare melding die naar playlists wijst. Geen credits, geen job (client-side).

**DEEL 5 — Model-chain opschonen.** `speech_models = ["universal-3-5-pro", "universal-2"]` (+ `language_detection=True`), conform AssemblyAI's eigen aanbeveling. `universal-3-pro` verwijderd uit de chain: zijn 6 native talen zijn een **deelverzameling** van Universal-3.5 Pro's 18, dus met 3.5 Pro vooraan kon het **nooit** geselecteerd worden (dode tak). Het per-model COR-tarief voor `universal-3-pro` blijft in `cost_config` staan (historische runs, ADR-070).

## Rationale

- **Credit-veiligheid:** duur- en playlist-checks zitten strikt **vóór** `reserve_credits`; een user kan er nooit credits aan verliezen (geverifieerd, zie Consequenties). `_sale_vat`/`vat_by_country`/omzet-recognitie onaangeraakt.
- **Instrumentatie proportioneel:** caption-latency is nul-kosten meetbaar en vult het enige echte gat (AI-jobs hebben al `processing_time_seconds`). Zie "Bewust niet gebouwd".
- **Chain:** een onbereikbaar chain-lid is misleidend en verhoogt onnodig de kans op verrassingen; AssemblyAI's aanbeveling is 3.5 Pro + Universal-2.

## Consequenties

- **Geverifieerd:** (DEEL 5) 2-model-chain + language_detection → Engels effectief `universal-3-5-pro`. (DEEL 1) RPC schrijft `duration_ms` (smoke: 4321 ms gelogd + opgeruimd). (DEEL 2) duur-cap zit vóór de reservering (code-volgorde + live 422-test op een gemockte 40.000s-duur, saldo ongewijzigd). (finance) reconciliatie-invariant `(against−fee)+goodwill = Σ methode-COR` blijft exact (29,0101=29,0101); audit 31/0/0 onaangeroerd (geen finance-functie gewijzigd; `duration_ms` wordt door geen COR-berekening gelezen).
- **Content rechtgetrokken:** playlist-capaciteit overal → **500 video's/job** (was tegenstrijdig "≤100" / "5.000"). Taalclaims → 18 (Universal-3.5 Pro) / 99 (Universal-2) met WER-tier-indeling; captions = "elke taal waarvoor YouTube captions levert" (het getal 67 had geen grondslag → geschrapt). Bron: https://www.assemblyai.com/docs/supported-languages
- **Bewust niet gebouwd (gerapporteerd):** per-fase AI-job-timing (download/upload/transcriptie/opslag) — vergt threading van timestamps door de pipeline; totaal is al gedekt door `processing_time_seconds`. Gecategoriseerde faalredenen op `transcription_jobs` — waardevol maar raakt de error-paden; later. Export-formaat-per-download — exports zijn client-side (geen server-call); loggen zou een **extra request per download** kosten → valt buiten "zonder extra kosten".
