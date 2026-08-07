# Beslissing 090: AI-samenvatting — twee modelstappen, gestructureerd schema, achtergrondtaak

**Status:** Geaccepteerd
**Datum:** 2026-08-07
**Gerelateerde code:** `backend/summary_pipeline.py`, `backend/main.py` (`/api/summarize`, `/api/summary/jobs/{id}`), `backend/worker.py` (`run_summary_job` + summary-reaper), `backend/credit_manager.py` (`calculate_summary_cost`, `settle_credits` +`p_product_type`), `apps/app/src/components/library/AiSummaryView.tsx`, `apps/app/src/components/library/TranscriptViewer.tsx`, migraties `20260807204300`–`20260807204307`

## Context

De oude samenvatting (synchrone `POST /api/summarize`, `maxDuration=60`) stuurde het volledige transcript in één call naar `gemini-2.5-flash` met een systeemprompt die letterlijk om **één alinea** vroeg, **zonder `max_tokens`** en zonder enige koppeling aan de duur. Gevolg: een video van vier uur leverde evenveel tekst op als één van vijftien minuten — de uitkomst schaalde met het model-gemiddelde, niet met de inhoud. Daarnaast blokkeerde de 60s-route bij lange transcripten.

## Beslissing

**Twee modelstappen + assemblage in code, als achtergrondtaak.**

- **Stap 1 (structuur)** — één call naar **`claude-sonnet-4-6`** op het EU-gateway-endpoint over het volledige, getimestampte transcript → een overkoepelende samenvatting + secties (kop + begin/eind-tijdstempel in seconden). Sonnet omdat het bepalen van sectiegrenzen over een heel transcript een redeneertaak is die het sterkste model verdient. Onder-/bovengrens op het aantal secties (`min(20, max(3, ⌈duur_min/10⌉))`), geclampt in code (nooit opsplitsen om een ondergrens te halen — dat zou opvullen zijn).
- **Stap 2 (uitwerking)** — per sectie een aparte call naar **`gemini-2.5-flash`** met alleen het fragment tussen de tijdstempels + kop + overkoepelende samenvatting als context. Gemini omdat dit veel goedkope, parallelle calls zijn (begrensd met een semafoor; de gateway-rate-limit is per model per 60s). De opdracht is **volledige dekking** van het fragment (elk argument/voorbeeld/cijfer/naam/tussenstap), met als **richting** (niet eis) ~⅓ van het aantal fragmentwoorden, korter bij dun materiaal. `max_tokens` is alleen een ruim vangnet afgeleid van de fragmentlengte — het stuurt niets.
- **Stap 3 (assemblage)** — in code, geen modelcall.

**Structured output** via een echt JSON-schema (`response_format.type = "json_schema"`), niet `response_format: json_object`. **Gateway-fallback** per call via `fallbacks` + `fallback_config` (vervangt de oude handmatige model-fallback), zodat een mislukte sectiecall de run niet laat mislukken.

**Nieuw schema** op `transcripts.ai_summary` (JSONB, geen DDL): `{ schema_version: 2, overview, sections: [{heading, start_time, end_time, content}], generated_at, edited }`. Het oude `{text, action_points, html, edited_html}` vervalt volledig; de bestaande payloads zijn hard gewist (geen legacy-reader, geen backfill — DB gaat vóór launch leeg). De tijdstempels zijn klikbaar en laten de in-app speler seeken (hergebruik van `NocookieYouTubePlayer.seekTo`, dezelfde functie als de transcript-tijdstempels).

**Creditregel** (vervangt de vaste 3): **3 credits t/m 30 minuten videoduur, daarna +1 per begonnen 30 minuten** (`calculate_summary_cost`). Deterministisch uit de duur → reservering == afrekening. Reservering bij job-start, afrekening (settlement gestempeld `product_type='ai_summary'`) bij succes, **volledige teruggave** bij elk faalpad of worker-dood.

**Achtergrondtaak** in de bestaande ARQ-queue met status-polling vanaf de frontend (`run_summary_job` → `/api/summary/jobs/{id}`), i.p.v. de synchrone 60s-route.

**Gedeelde jobtabel.** De summary-job draait op een rij in **`transcription_jobs`** met **`source_kind='ai_summary'`** als discriminator (i.p.v. een aparte `summary_jobs`-tabel). Zo erft hij de bestaande `reserve_credits`/`refund_credits`-RPC's én de watchdog-reconciliatie (auto-refund bij crash) gratis. De transcript-id-kolom draagt de te-samenvatten transcript (valide FK + sluit de rij automatisch uit van de whisper-watchdog-passes die `transcript_id IS NULL` vereisen). Er is één dedicated summary-reaper voor dode summary-jobs (whisper-passes zijn expliciet uitgesloten van `ai_summary`, zodat een summary nooit als `run_whisper_job` her-ingediend wordt).

## Rationale

- **Waarom twee modellen, twee stappen:** de bug was dat één call zonder lengtekoppeling terugvalt op het model-gemiddelde. Structuur-eerst (sterk model) + per-sectie-dekking (goedkoop model, opdracht = dekking + informatiedichtheid-richtlijn) koppelt de uitkomst aan de inhoud i.p.v. aan de klok — het acceptatiecriterium is dan ook een **verhouding** (uitkomstwoorden/transcriptwoorden), geen absoluut aantal.
- **Waarom gedeelde tabel i.p.v. `summary_jobs`:** minste nieuwe code + volledige crash-robuustheid gratis. Prijs: elke lezer van `transcription_jobs` moet expliciet op `source_kind` filteren — die audit is uitgevoerd (zie Consequenties).
- **Waarom per-model COR:** stap 1 gebruikt een duurder model (sonnet); alles tegen één gemini-tarief boeken onder-boekt de COR. `_geld_scope` prijst nu per `ai_summary_usage_log.model`.

## Consequenties

- **`transcription_jobs` is bewust een gedeelde jobtabel; `source_kind` is de discriminator.** Elke lezer/teller die transcriptie bedoelt is nagelopen en filtert nu expliciet: `_geld_scope` (COR + proxy-overhead), `admin_operations_summary` (6 clauses), `admin_operations_v3` (2 unit-level clauses zonder guard), `_count_active_jobs` (concurrency-cap), de whisper-watchdog-passes (reaper/re-enqueue/Pass 2), en `ActiveJobsIndicator`. Elke volgende lezer van deze tabel moet hetzelfde doen.
- Nieuwe migraties: `source_kind` +`ai_summary`; `settle_credits` +`p_product_type`; `ai_summary_usage_log` +`request_id`/`region`; `cost_config` sonnet-tarief (1.1× Anthropic-list, af te stemmen op de gateway-factuur); `_geld_scope` per-model + source_kind-filters; admin-ops filters; wipe oude summaries.
- Per-call logging (`ai_summary_usage_log`) draagt nu `request_id`/`region`; de gateway-usage-velden zijn `input_tokens`/`output_tokens` (niet `prompt_tokens`/`completion_tokens`).
- De summary is read-only (overview + secties); het oude in-place HTML-editen van de samenvatting (`edited_html`, `summary_edited`-tab) vervalt.
- Model-id's `claude-sonnet-4-6`/`gemini-2.5-flash` en de fallback-vorm (`fallbacks` top-level array + `fallback_config {retry,depth}`) zijn geverifieerd tegen de gateway-docs. Bij een gedateerde gateway-variant: bevestigen vóór wiring.
