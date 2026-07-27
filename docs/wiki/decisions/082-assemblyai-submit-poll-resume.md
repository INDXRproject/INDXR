# Beslissing 082: AssemblyAI submit()+poll met resume-veilige provider-id

**Status:** Geaccepteerd
**Datum:** 2026-07-27
**Gerelateerde code:** `backend/assemblyai_client.py`, `backend/transcription_pipeline.py` (`_submit_and_poll`, `_resume_reject_reason`), `backend/worker.py` (`WorkerSettings.job_timeout`), migratie `20260727123756_add_provider_transcript_id.sql`, test `backend/test_submit_poll_resume.py`

## Context

De AssemblyAI-transcriptie draaide via de blocking `transcriber.transcribe(audio_path)`: één call die
intern upload + submit + poll-tot-klaar deed en pas terugkeerde als de job af was. Drie problemen:

1. **Geen fase-inzicht.** We konden de wachtrij-fase (submitted → processing) niet scheiden van de
   verwerkings-fase. Operations wilde juist die wachttijd meten (het signaal waar het dashboard om
   begon).
2. **Heartbeat-risico op lange jobs.** De blocking call tikte geen heartbeat; een lange transcriptie
   kon door de watchdog als "vastgelopen" worden aangezien.
3. **Geen resume.** Bij een worker-herstart midden in een transcriptie ging de provider-job verloren:
   de nieuwe run diende opnieuw in → dubbele facturering bij AssemblyAI.

## Beslissing

Vervang de blocking call door **submit() + eigen poll-loop**:

- `submit_assemblyai(audio_path)` dient non-blocking in en retourneert direct de provider-transcript-id.
- De pipeline (`_submit_and_poll`) persisteert die id + `submitted_at` op de eigen jobrij, pollt dan
  elke 10s via `poll_assemblyai(id)`, tikt per poll een heartbeat, en legt de fase-timestamps vast
  (`provider_processing_at` bij de eerste `processing`, `provider_processing_ms` bij `completed`,
  plus `assemblyai_language`/`assemblyai_model`).
- **Resume-veilig hergebruik** van een lopende provider-job na een worker-herstart, maar STRAK begrensd
  (nieuwe kolom `provider_transcript_id`): hergebruik alleen als de id op DEZELFDE jobrij staat, de job
  niet terminaal is, de submission binnen AssemblyAI's 1-dag-TTL valt, én de live poll-status
  `queued`/`processing` is. Elke twijfel → opnieuw indienen + loggen.
- **ARQ `job_timeout` uit config** (Defect 1): afgeleid van `MAX_TRANSCRIPTION_SECONDS + marge`
  (37800s) i.p.v. een vlakke 7200s die korter was dan wat een lange-maar-geaccepteerde file nodig kon
  hebben.

## Rationale

**Verkeerde inhoud > dubbel betalen.** Dubbel factureren is herstelbaar (geld); een gebruiker die de
tekst van een ándere video krijgt is dat niet (vertrouwen). Daarom valt elke twijfel bij het
resume-besluit naar opnieuw indienen, en trusten we alleen een aantoonbaar-actieve (`queued`/
`processing`) provider-job op de eigen rij binnen de bewaartermijn. De grens is bewezen met een test
die expliciet een stale én een mismatchende id aanbiedt en laat zien dat beide niet worden hergebruikt.

## Consequenties

- Operations kan queue-wait apart meten (leeg bij korte jobs die tussen twee polls klaar zijn — dat is
  correct; niet als 0 meetellen).
- Een worker-herstart verspilt geen dubbele AssemblyAI-facturering meer voor een lopende job.
- De segment-/taal-/model-parse is byte-voor-byte overgenomen uit het oude, in-prod-bewezen pad.
- **Verificatie-grens:** de echte submit+poll-levenscyclus is niet lokaal getest (geen lokale
  AssemblyAI-key) maar live in productie (deploy `f7c69fa`, worker startte schoon). Zie LOG 2026-07-27.
