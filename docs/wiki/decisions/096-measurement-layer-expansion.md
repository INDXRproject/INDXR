# Beslissing 096: Meetlaag-uitbreiding — snelheid, kwaliteit, kosten, gebruik, bewerkingsgraad

**Status:** Geaccepteerd
**Datum:** 2026-08-09
**Gerelateerde code:** `backend/assemblyai_client.py`, `backend/audio_utils.py`, `backend/transcription_pipeline.py`, `packages/shared/src/lib/measurement.ts`, `apps/app/src/components/library/{TranscriptViewer,TranscriptList,RagExportView}.tsx`, `apps/app/src/app/admin/operations/page.tsx`, migraties `20260809170000_measurement_layer_expansion.sql` + `20260809171000_admin_pipeline_metrics.sql`
**Volgt op:** ADR-092 (fasetijd-meetlaag was te smal — alleen download).

## Context

De meetlaag (ADR-092/093) dekte alleen download-fasetijden. Te smal: we konden niet zeggen hoe snel
we werkelijk zijn (real-time factor), of de transcriptiekwaliteit daalt, hoe goed het transcript is
volgens gebruikers, welke exportformaten gebruikt worden, of wat de marge per job is.

## Beslissing (per as, met de vraag die het beantwoordt)

**Snelheid — "hoe snel zijn we echt, en klopt de ~1:10-claim?"**
Fasetijden per job als aparte kolommen op `transcription_jobs`: `download_ms` (bestond), `compress_ms`
(ffmpeg-transcode), `transcribe_ms` (submit→provider-completed, incl. upload+queue), `save_ms`
(persist+finaliseren). Totaal = `processing_time_seconds`. Real-time factor (RTF) =
`processing_time_seconds / duration_seconds` — de branchemaat verwerkingstijd÷audioduur; berekend in
het Operations-paneel (niet opgeslagen). `compress_ms` loopt via de bestaande `summary_cb` uit
`extract_youtube_audio`; `transcribe_ms`/`save_ms` als wall-clock-deltas in de pipeline.

**Kwaliteit — "wordt het slechter, zien we het vóór een klacht?"** (belangrijkste stuk)
Antwoord vooraf geïnspecteerd (niet geraden): AssemblyAI geeft `transcript.confidence` (0-1,
SDK-attr) én — alleen in `json_response` — `language_confidence` (0-1, GEEN SDK-attr). Beide
opgeslagen op `transcription_jobs.transcript_confidence` / `language_confidence`. `poll_assemblyai`
leest ze uit het antwoord en de pipeline persisteert ze. Woord-/utterance-confidence bestaat ook maar
is buiten scope (overall volstaat).

**Bewerkingsgraad — "hoe goed is het transcript volgens onze gebruikers, per taal?"**
`transcripts.edit_ratio`: grove maat = woord-multiset-symmetrisch-verschil(bewerkt, origineel) ÷
origineel-woorden, berekend bij het opslaan van een bewerking (`computeEditRatio`, O(n)). Bewust grof
(geen Levenshtein op 30k woorden): het gaat om de trend per taal, niet om precisie; herordening telt
niet mee. Onderbouwt waarom we (terecht) geen nauwkeurigheidsclaim doen buiten Engels: we gaan het nu
meten i.p.v. aannemen.

**Gebruik — "welke van de 9 downloadopties wordt echt gebruikt?"**
Nieuwe tabel `export_events` (`format`, `source`, `transcript_id`, `user_id`, `created_at`); elke
ingelogde export (niet alleen de betaalde RAG) logt fire-and-forget via `trackExport`. RLS:
insert-own; admin leest via service-role. Anonieme free-tool-export (alleen TXT) niet gelogd
(RLS + niet ingelogd) — de interessante 9-formaten-vraag speelt bij ingelogde gebruikers.

**Kosten — "marge per job zonder her-afleiden."**
`transcription_jobs.cost_eur`: gedenormaliseerde kostprijs (STT + diarisatie-add-on + proxy-egress)
via `job_cor_eur()` (zelfde tarief-helpers als `_geld_scope` → single-source rates), gezet bij
completion via `compute_and_store_job_cost()`; cache-hit = 0. **GEEN nieuwe COR-bron** — `_geld_scope`
blijft gezaghebbend; dit is een snapshot voor snelle marge-queries.

**Weergave — twee panelen op de bestaande Operations-pagina** (geen nieuw dashboard): (1) fasetijden +
RTF in **p50/p90/p95/p99** (percentielen, geen gemiddelden), (2) confidence-trend per taal per week.
Bron: nieuwe admin-RPC `admin_pipeline_metrics()` (naast `admin_operations_v3` aangeroepen). Niet
window-scoped (aparte, gelabelde sectie).

## Grenzen (bewust NIET verzameld)

Geen ruwe audiokenmerken, geen extra gedragsregistratie buiten export-formaat, geen inhoudsanalyse van
transcripten. Alles forward-only (bestaande rijen NULL), behalve waar een backfill triviaal + correct
was: `cost_eur` (uit bestaande kolommen × huidige tarieven, 239 jobs) en de confidence van de ene
recente run (provider-waarden binnen TTL opgehaald).

## Consequenties

- Fasetijd-kolommen `compress_ms`/`transcribe_ms`/`save_ms` en confidence vullen vanaf nu; de
  percentiel- en trend-panelen tonen ze zodra jobs binnenkomen.
- `cost_eur` maakt marge-per-job één kolom-lookup; blijft consistent met `_geld_scope` via dezelfde
  helpers (bij tariefwijziging schuift alleen nieuw-gestempelde cost_eur mee, oude snapshots niet —
  aanvaard, het is een momentopname).

## Bevindingen uit bestaande data (2026-08-09)

- **Real-time factor** over 236 voltooide echte transcripties: **p50 0,0537 · p90 0,124 · p95 0,165 ·
  p99 0,269** (min 0,0066, max 0,391). Als "1:X": p50 ≈ 1:19, p90 ≈ 1:8, p95 ≈ 1:6, p99 ≈ 1:3,7. De
  artikelclaim ~1:10 (RTF 0,1) **klopt voor de mediaan (ruim, ~2× sneller) maar breekt vanaf p90** —
  de traagste ~10-15% van de jobs is trager dan 1:10. De run van deze week (Rxmw9eizOAo) zat op ~1:22.
- **Her-download**: `download_attempts` is forward-only sinds ADR-092; er is **1 geïnstrumenteerde job**
  (0 met >1 poging, €0 extra egress). Te weinig data voor een percentage — dat accumuleert vanaf nu.
  Historische jobs hebben `download_attempts` NULL, dus daar is het niet af te leiden.

## Verificatie

- AssemblyAI-antwoord geïnspecteerd (confidence 0,9727 / language_confidence 0,9842); `poll_assemblyai`
  geeft beide terug (bewezen op de echte transcript).
- `compress_ms` + `download_ms` via `summary_cb` bewezen op een echte download (9179ms / 208ms).
- `job_cor_eur`/`compute_and_store_job_cost` geverifieerd (run = €0,897 = €0,0054/credit → gezonde
  marge) + 239 jobs gebackfild; ACL: anon/authenticated geweigerd.
- `admin_pipeline_metrics()` levert geldige JSON (RTF-percentielen == handquery; total_ms n=237;
  confidence_trend 1 rij).
- 14 backend-tests groen; `pnpm build` groen (2/2).
