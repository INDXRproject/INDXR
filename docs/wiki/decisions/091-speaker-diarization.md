# Beslissing 091: Sprekerherkenning (diarisatie) in AI-transcriptie

**Status:** Geaccepteerd
**Datum:** 2026-08-08
**Gerelateerde code:** `backend/assemblyai_client.py`, `backend/transcription_pipeline.py`, `packages/shared/src/utils/formatTranscript.ts`, `apps/app/src/components/library/TranscriptViewer.tsx`, `apps/app/src/components/library/RagExportView.tsx`, `apps/app/src/components/library/TranscriptList.tsx`, migratie `20260808120000_diarization_speaker_labels.sql`

## Context

AI-transcriptie (AssemblyAI, upload + YouTube-AI) leverde tot nu toe alleen tekstsegmenten
`{text, offset, duration}` zonder wie-zegt-wat. Diarisatie stond nergens aan (`grep speaker` = 0 hits).

**Onderzoek vóór de bouw (drie vragen):**

1. **Config?** `speaker_labels` stond niet in `_TRANSCRIPTION_CONFIG`. Nul referenties in de codebase.
2. **Tarief?** Tegenstrijdige info opgelost tegen de AssemblyAI-prijspagina: basisdiarisatie zit
   **NIET** in het basistarief. Het is een async **add-on die additief op het modeltarief stapelt**:
   **standaard +$0,02/uur** (experimenteel +$0,065/uur). Universal-2 $0,15→$0,17/u; Universal-3.5 Pro
   $0,21→$0,23/u. Geen EU-premie (EU=US, net als STT, ADR-070).
3. **Antwoordvorm?** Elk `word` krijgt `.speaker` ('A'/'B'/…); daarnaast `transcript.utterances`
   (per-spreker, ms). Het model bepaalt zelf het aantal sprekers (default; `speakers_expected` niet gezet).

## Beslissing

**Bronlaag.** `speaker_labels=True` in `_TRANSCRIPTION_CONFIG` (geldt voor élke AssemblyAI-run —
upload + YouTube-AI; captions lopen hier niet langs). `_build_segments` behoudt de bestaande
~5s-woordgroepering maar **breekt óók af bij een sprekerwissel** en stempelt `speaker` per segment,
zodat elk segment precies één spreker bevat (utterances zelf kunnen minutenlang zijn → zouden
reading-paragraphs en RAG-chunking breken). Zonder diarisatie is `word.speaker` None → geen
`speaker`-key; het segment blijft exact `{text, offset, duration}` (captions/oude transcripten ongemoeid).

**Opslag.** Het kenmerk staat per segment in de bestaande `transcripts.transcript` jsonb. De
**hernoemtoewijzing staat APART** in de nieuwe kolom `transcripts.speaker_names` (`{"A":"Alice"}`) en
wordt als **overlay** toegepast bij tonen + export. De transcripttekst en de labels worden nooit
overschreven → **origineel altijd herstelbaar; één keer hernoemen = overal**. Leeg veld = terug naar
de `Speaker A`-fallback.

**Kosten.** `cost_config.assemblyai_diarization_usd_per_hour = 0.02` + helper
`assemblyai_diarization_eur_per_min()` (mirror van `assemblyai_stt_eur_per_min`, ADR-070). Per-job vlag
`transcription_jobs.diarization` (gezet bij completion in `_submit_and_poll` → alleen echte
AssemblyAI-runs, niet cache-hits (COR=0) en niet `ai_summary`-jobs (lopen via `run_summary_job`)).
`_geld_scope` telt de add-on op bij de **twee** STT-COR-expressies (scope-totaal `v_stt_audio_eur` +
per-user against-revenue subquery `a`), conditioneel op `diarization`. Enige COR-bron: `_geld_scope`
(snapshot_finance_day / admin_finance_summary / admin_geld_summary routeren daar allemaal doorheen —
geverifieerd). **De creditprijs voor de gebruiker verandert NIET** (`math.ceil(duration/60)`).

**Weergave.** De transcriptweergave toont de (hernoemde) spreker vet vooraan elke alinea. Een
"Speakers"-knop (alleen bij diarisatie) opent een dialoog om labels een naam te geven → opgeslagen in
`speaker_names`, direct overal toegepast.

**Export per formaat** (bewust per conventie gekozen):

| Formaat | Sprekerweergave |
|---------|-----------------|
| TXT (plat + timestamps) | `Naam: `-prefix per alinea/segment |
| Markdown | `**Naam:** `-prefix, breekt op sprekerwissel |
| CSV | aparte `speaker`-kolom — **alleen** als er sprekers zijn (anders schema ongewijzigd) |
| SRT | `Naam: `-prefix in de cue (SRT kent geen sprekerveld) |
| VTT | native `<v Naam>`-voice-tag |
| JSON (plat) | `speaker`-veld per segment = de hernoemde naam |
| RAG JSON | `metadata.speakers`-lijst per chunk (chunks mengen segmenten → meerdere sprekers mogelijk) |

Bestaande transcripten zonder kenmerk renderen/exporteren zonder lege sprekerlabels.

## Rationale

- **Woordgroepering behouden i.p.v. utterances**: houdt de ~5s-granulariteit die de rest van de app
  (reading-paragraphs, resegment, RAG) veronderstelt; sprekerwissel als extra breekpunt geeft
  homogene segmenten zonder de bestaande structuur te breken.
- **Aparte `speaker_names`-overlay**: voldoet aan "hernoemen apart opslaan, origineel herstelbaar,
  één keer = overal" zonder de bron te muteren.
- **Per-job `diarization`-vlag i.p.v. modelafleiding**: het model zegt niets over of diarisatie liep;
  legacy jobs (false) verschuiven zo niet retroactief in COR.
- **Add-on alleen in `_geld_scope`**: één bron, geen dubbele COR-logica (snapshot/admin routeren erdoor).

## Consequenties

- **Kosten:** +$0,02/u op elke nieuwe AI-transcriptie-COR (~10–13% bovenop STT). Marge iets lager;
  creditprijs ongewijzigd → bewuste keuze (kwaliteitsfeature).
- **Migratie is no-op op historie:** bewezen byte-identiek COR (internal ai_transcription €31,6354
  vóór==na); add-on = 0 zolang geen job `diarization=true` heeft. A/B: 8299,42 min × €0,00030667 =
  €2,5452 als álle internal jobs de vlag zouden hebben (formule vuurt correct).
- **Cache:** de master-cache draagt `speaker` vanzelf mee (segmenten gaan ongewijzigd naar R2). Oude
  cache-entries zonder sprekers renderen zonder labels.
- **Geen wijziging** aan credits, VAT, omzet-recognitie.

## Verificatie (2026-08-08)

- **Echte 2-spreker-run** (Newman/Peterson-interview, 151s) via de echte `submit_assemblyai`/
  `poll_assemblyai`: `speaker_labels` gehonoreerd, **2 sprekers (A+B)**, 32 segmenten allemaal gelabeld,
  model `universal-3-5-pro`. **Werkelijke kosten:** STT $0,00881 + diarisatie $0,00084 = **$0,00965
  (€0,00888)**; diarisatie-add-on = 151/3600 × $0,02 = $0,00084 ✓; credits = 3 (ongewijzigd).
- **Migratie:** COR byte-identiek vóór/na; helper = $0,02/60×0,92 = €0,00030667/min; `anon` EXECUTE
  geweigerd; migratie getrackt (+1 rij).
- **Formaten:** alle generatoren getest op de echte gediariseerde transcript mét hernoemtoewijzing
  (A→Cathy Newman, B→Jordan Peterson): SRT-prefix, VTT-`<v>`-tags, TXT-prefix, RAG-`speakers`. Niet-
  gediariseerde regressie byte-identiek (geen kolom, geen tag, geen label).
- **Segmentlogica** unit-getest (sprekerwissel-breuk + geen-spreker-fallback).
- Frontend `pnpm build` groen (2/2).
