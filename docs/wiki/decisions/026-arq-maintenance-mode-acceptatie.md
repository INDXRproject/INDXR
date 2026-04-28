# Beslissing 026: ARQ maintenance-mode acceptatie

**Status:** Geaccepteerd
**Datum:** 2026-04-28
**Gerelateerde code:** `backend/worker.py`, `backend/requirements.txt`

---

## Context

Tijdens de voorbereiding van Taak 1.5 Fase 3 (playlist → per-video chain) is ontdekt dat ARQ in maintenance-only mode zit. Dit is gedocumenteerd in github.com/python-arq/arq#510: de auteur (Samuel Colvin, tevens auteur van Pydantic) gebruikt ARQ zelf nog in productie maar er komen geen nieuwe features meer. Security patches worden wel uitgebracht.

Op dat moment hadden we Fase 0 (TCP verificatie), Fase 1 (ARQ infra) en Fase 2 (Whisper → ARQ) al succesvol geverifieerd in productie.

De vraag was: migreren naar een actief-ontwikkelde library, of ARQ houden?

---

## Beslissing

**ARQ blijft de queue-library tot post-launch heroverweging.**

De architecturale keuze (per-video decompositie, Supabase als state, deterministic job IDs) is library-onafhankelijk. Het risico van ARQ's maintenance-mode is beheersbaar. Een library-swap halverwege Fase 1 introduceert meer risico dan het oplost.

---

## Rationale

**ARQ werkt aantoonbaar op onze stack.** Fase 0–2 zijn geverifieerd. Het transport-mechanisme doet wat het moet doen.

**Het echte probleem is architectureel, niet library-specifiek.** De monolithische `run_playlist_job` lus zonder partial-completion-recovery is het eigenlijke risico. Dit wordt opgelost via per-video decompositie (ADR-025), wat op elke queue-library werkt.

**Alle state leeft in Supabase, niet in ARQ.** `playlist_extraction_jobs`, `transcription_jobs`, `idempotency_keys` — alles persisteert in Supabase. ARQ is alleen het transport-mechanisme. Een library-swap later is geschat 1–2 dagen werk.

**Maintenance-only is niet abandoned.** Security patches worden uitgebracht. De auteur draait het zelf in productie. Het risico dat ARQ plotseling stopt te werken is laag.

---

## Alternatieven overwogen en waarom niet nu

| Library | Reden voor afwijzing |
|---|---|
| **Taskiq** | Open graceful-shutdown bug (issue #447) raakt direct onze Railway SIGTERM use case. Niet bewezen op onze stack. |
| **streaq** | Te jong (~2k LOC), niet bewezen op productie-schaal. Onverwachte edge cases zijn realistisch. |
| **Procrastinate** | Verschuift queue-load naar Supabase database die ook user-data draait. Connection-pool druk neemt toe. |
| **Celery / Dramatiq** | Sync-first, mismatch met async FastAPI. Zou worker rewrite vereisen. |
| **Temporal** | Industriestandaard maar operationeel zwaar (eigen Postgres + workers + history), overkill voor onze schaal. |
| **Inngest / Trigger.dev** | TypeScript-first, Python-paden minder volwassen. Verkeerde stack-fit. |
| **BullMQ** | Node.js library, niet bruikbaar in Python backend. |

Geen van de actief-ontwikkelde alternatieven biedt een acuut voordeel boven ARQ voor onze huidige use case zonder nieuwe onzekerheden te introduceren.

---

## Migratie-pad

Bij toekomstige migratie weg van ARQ:
- Architectuur blijft intact (per-video chain, ADR-025)
- Data blijft intact (alles in Supabase)
- Alleen `worker.py` library-aanroepen en `enqueue()` calls in `main.py` wijzigen
- Geschat werk: 1–2 dagen

Zie ADR-019 sectie "Migratie-pad weg van ARQ" voor de volledige beschrijving.

---

## Post-launch heroverweging

Library-keuze wordt opnieuw geëvalueerd na launch. Trigger: eerste van:
- (a) Zes maanden post-launch
- (b) Een ARQ-specifieke bug die ons blokkeert
- (c) Een productie-incident dat een library-feature vereist die ARQ niet biedt

Kandidaten op dat moment evalueren met productie-data: Taskiq (graceful shutdown bug check), streaq (rijpheid na ~6 maanden extra), Procrastinate (connection-pool impact meten).

Zie priorities.md taak 3.11 voor de gestructureerde heroverweging.
