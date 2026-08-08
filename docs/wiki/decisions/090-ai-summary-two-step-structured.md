# Beslissing 090: AI-samenvatting — twee modelstappen, gestructureerd schema, achtergrondtaak

**Status:** Geaccepteerd
**Datum:** 2026-08-07
**Gerelateerde code:** `backend/summary_pipeline.py`, `backend/main.py` (`/api/summarize`, `/api/summary/jobs/{id}`), `backend/worker.py` (`run_summary_job` + summary-reaper), `backend/credit_manager.py` (`calculate_summary_cost`, `settle_credits` +`p_product_type`), `apps/app/src/components/library/AiSummaryView.tsx`, `apps/app/src/components/library/TranscriptViewer.tsx`, migraties `20260807204300`–`20260807204307`

## Context

De oude samenvatting (synchrone `POST /api/summarize`, `maxDuration=60`) stuurde het volledige transcript in één call naar `gemini-2.5-flash` met een systeemprompt die letterlijk om **één alinea** vroeg, **zonder `max_tokens`** en zonder enige koppeling aan de duur. Gevolg: een video van vier uur leverde evenveel tekst op als één van vijftien minuten — de uitkomst schaalde met het model-gemiddelde, niet met de inhoud. Daarnaast blokkeerde de 60s-route bij lange transcripten.

## Beslissing

**Twee modelstappen + assemblage in code, als achtergrondtaak.**

- **Stap 1 (structuur)** — één call over het volledige, getimestampte transcript → een overkoepelende samenvatting + secties (kop + begin/eind-tijdstempel in seconden). Onder-/bovengrens op het aantal secties (`min(20, max(3, ⌈duur_min/10⌉))`), geclampt in code (nooit opsplitsen om een ondergrens te halen — dat zou opvullen zijn). **Model: sinds addendum 2 `gemini-2.5-flash` (sonnet-4-6 als fallback)** — de kostenmeting toonde gelijkwaardige dekking tegen ~1/5 kost; oorspronkelijk was dit `claude-sonnet-4-6`.
- **Stap 2 (uitwerking)** — per sectie een aparte call naar **`gemini-2.5-flash`** met alleen het fragment tussen de tijdstempels + kop + overkoepelende samenvatting als context. Gemini omdat dit veel goedkope, parallelle calls zijn (begrensd met een semafoor; de gateway-rate-limit is per model per 60s). De opdracht is **volledige dekking** van het fragment (elk argument/voorbeeld/cijfer/naam/tussenstap), met als **richting** (niet eis) ~⅓ van het aantal fragmentwoorden, korter bij dun materiaal. `max_tokens` is alleen een ruim vangnet afgeleid van de fragmentlengte — het stuurt niets.
- **Stap 3 (assemblage)** — in code, geen modelcall.

**Structured output** via een echt JSON-schema (`response_format.type = "json_schema"`), niet `response_format: json_object`. **Gateway-fallback** per call via `fallbacks` + `fallback_config` (vervangt de oude handmatige model-fallback), zodat een mislukte sectiecall de run niet laat mislukken.

**Nieuw schema** op `transcripts.ai_summary` (JSONB, geen DDL): `{ schema_version: 2, overview, sections: [{heading, start_time, end_time, content}], generated_at, edited }`. Het oude `{text, action_points, html, edited_html}` vervalt volledig; de bestaande payloads zijn hard gewist (geen legacy-reader, geen backfill — DB gaat vóór launch leeg). De tijdstempels zijn klikbaar en laten de in-app speler seeken (hergebruik van `NocookieYouTubePlayer.seekTo`, dezelfde functie als de transcript-tijdstempels).

**Creditregel** (vervangt de vaste 3): **3 credits t/m 30 minuten videoduur, daarna +1 per begonnen 20 minuten** (`calculate_summary_cost` — bijgesteld van /30 naar /20 in addendum 2 op basis van de marge-meting). Deterministisch uit de duur → reservering == afrekening. Reservering bij job-start, afrekening (settlement gestempeld `product_type='ai_summary'`) bij succes, **volledige teruggave** bij elk faalpad of worker-dood.

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

---

## Addendum (2026-08-08) — kwaliteitsronde

Na verificatie op echte video's (5min/20min/4u) zijn zes uitvoergebreken + één structurele beperking
verholpen:

1. **Markdown veilig renderen.** Stap-2-uitvoer is markdown; de weergave toonde het letterlijk. Nieuw:
   `SummaryMarkdown.tsx` met **react-markdown** (parseert naar elementen, géén `dangerouslySetInnerHTML`,
   géén raw-HTML). Beperkt tot koppen/lijsten/vet/cursief/alinea's/blockquote/code; **geen `img`/`a`**
   uit modeltekst (`unwrapDisallowed`).
2. **Preambules + dubbele koppen.** Promptkant: begin direct met inhoud, herhaal de kop niet, geen
   meta-openingen. Codekant: `_clean_section_content` verwijdert een eerste regel ≈ de kop en een
   meta-openingszin. De E2E rapporteert of de code-cleanup nog moest vuren (prompt vs code).
3. **Niet-dekkende koppen + doorgelopen inhoud.** Stap-1-schema kreeg een `description` per sectie;
   stap 2 krijgt kop+omschrijving als **bindende scope** ("behandel alleen wat hieronder valt, sla
   uitloop over") en geeft een **gecorrigeerde kop** terug (structured `{heading, content}`), die de
   uiteindelijke uitvoer gebruikt.
4. **Volledige dekking valideren (belangrijkste).** Stap 1 kan het laatste deel van een lange video
   stil overslaan (in de 4u-test begon het laatste hoofdstuk op 3:23:57 van 4:13:49). `_normalize_sections`
   detecteert nu expliciet gaten/overlap/te-vroeg-einde, rekt op naar de volle duur en **logt** het; de
   E2E rapporteert het gedekte % + het aantal correcties.
5. **Plafond weg / plateau expliciet.** `section_bounds` = `clamp(⌈duur/8⌉, 3, 40)` (was hard 20).
   **Plateau:** boven ~`SECTION_CAP × SECTION_MINUTES` = 40 × 8 = **320 min ≈ 5u20m** worden de
   hoofdstukken langer i.p.v. talrijker. De bovengrens bestaat bewust om **kosten en de per-model-per-60s
   gateway-rate-limit** te begrenzen (begrensde parallelliteit `SUMMARY_SECTION_CONCURRENCY`, default 5).
   Boven 5u20m schaalt de per-hoofdstuk-uitwerking nog mee, het aantal hoofdstukken niet.
6. **JSON-faalpad afgevangen.** Stap 2 is nu structured JSON met een lange markdown-string; een
   onparseerbaar antwoord valt terug op de ruwe tekst + de stap-1-kop (één kapotte sectie mag nooit een
   run van 30 laten falen ná betaling). De E2E telt hoe vaak dit vuurde.
7. **Doorlooptijd + resume.** Frontend `MAX_POLLS` 300→**600** (~30min), backend `SUMMARY_STALE_MINUTES`
   15→**30**. `TranscriptViewer` hervat bij binnenkomst een nog-lopende summary-job (DB-query op
   `transcription_jobs`) — terugkeren/verversen pikt een na het stoppen afgeronde summary op, **zonder
   herbetaling** (bestaande gereserveerde job).

---

## Addendum 2 (2026-08-08) — kostenmeting: stap-1-model, splitsing, creditformule

Gemeten met `backend/e2e_summary_measure.py` op vier echte transcripts (5min/20min/59min/4u13m).

**Kosten per modelstap** (totaal €, gemini in stap 1; per-model tarief × FX 0.92):

| duur | stap-1 € | stap-2 € | totaal € |
|---|---|---|---|
| 5 min | 0.0053 | 0.0071 | 0.012 |
| 20 min | 0.0078 | 0.0165 | 0.024 |
| 59 min | 0.0593 | 0.0264 | 0.086 |
| 4u13m | 0.0464 | 0.1374 | 0.184 |

**Stap 1: sonnet-4-6 → gemini-2.5-flash** (sonnet blijft fallback). Op de 4u-video kost sonnet-stap-1 ~€0.23 tegen gemini ~€0.046 — **~1/5**. Beslissende onderbouwing uit de dekkingsstudie: **beide modellen leveren ongeveer even vaak een te groot hoofdstuk op, maar langs een andere route** — Gemini via een zeldzaam gevouwen gat (1 van 5 4u-runs: 88.7% ruwe dekking, één gat van 1025s), Sonnet via onder-segmentatie (mediaan hoofdstuk max/gem 3.66×, één run zelfs 15.19×, mét 100% dekking en 0 gaten). Sonnet is dus niet duidelijk beter op de metric die telt (verdunning); zijn kostennadeel weegt niet op. `claude-haiku-4-5` viel af op **onvolledige dekking** (91.4% in de eerste vergelijking).

**Spreiding uit de dekkingsstudie** (5× gemini + 3× sonnet per video — **één run is ruis, kijk naar de spreiding**):
- 20min · gemini: dekking min 95.4 / med 100 / max 100; grootste gat max 54s. Sonnet: 100% altijd.
- 4u · gemini: dekking min 88.7 / med 99.8 / max 100; grootste gat min 2 / med 3 / **max 1025s**; hoofdstuk max/gem med 2.07 / max 2.81. Sonnet: dekking 100% altijd; hoofdstuk max/gem med 3.66 / **max 15.19**.

**Splitsingsregel (dekt de eigenlijke zwakte af — geldt voor béíde modellen):** ná de validatie wordt de MEDIANE hoofdstukduur van de run bepaald; een hoofdstuk **> 2× die mediaan** wordt in gelijke delen **< mediaan** gehakt, elk deel een eigen stap-2-call met dezelfde kop+omschrijving als bindende afbakening, daarna samengevoegd onder één kop (geen dubbele inleidende zin). De **zichtbare hoofdstukindeling verandert niet** — alleen de verwerking, zodat een gevouwen gat of onder-segmentatie de uitwerking daar niet verdunt. Criterium: geen verwerkings-fragment > 2.5× het mediane fragment. `_plan_section_fragments`/`_merge_parts`/`_run_step2` in `summary_pipeline.py`; gelogd wanneer + hoe vaak een splitsing vuurt.

**Nieuwe creditformule:** 3 credits t/m 30 min, daarna **+1 per begonnen 20 min** (was 30). Netto-marge per pakket (bruto/BTW-incl. lijstprijs, gemini-stap-1 + /20): **alle tiers positief**, ook Power@4u13m (+€0.116); voorheen (/30 + sonnet) sloeg Power vanaf 59min en Plus bij 4u om naar verlies. Financieel pad: `calculate_summary_cost` is de enige backend-bron (reservering==afrekening==teruggave); frontend `TranscriptViewer.summaryCost` spiegelt exact.

**Thinking-tokens = bekende, niet-ingezette knop:** de gateway rapporteert reasoning apart in `usage.completion_tokens_details.reasoning_tokens`. **Ruim de helft van de uitvoertokens is denkwerk** (gemeten 54–84%, afhankelijk van duur/model) en dat wordt gewoon **afgerekend** (het zit in output_tokens). We zetten thinking bewust NIET uit — vastgelegd zodat de volgende lezer weet dat dit een beschikbare kostenknop is.

**Gateway-model-id valkuil:** de kale alias `claude-haiku-4-5` geeft 400 op de gateway; alleen `claude-haiku-4-5-20251001` werkt. De sectie-fallback is daarnaar gecorrigeerd. Zie `docs/LESSONS.md` (verifieer gateway-modelnamen met een echte call).
