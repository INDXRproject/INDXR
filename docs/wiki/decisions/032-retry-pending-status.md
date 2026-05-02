# Beslissing 032: retry_pending Status voor Playlist Crash Recovery (ADR-030 Gap 1)

**Status:** Geaccepteerd  
**Datum:** 2026-05-02  
**Gerelateerde code:** `backend/worker.py`, `supabase/migrations/20260502_playlist_retry_pending_status.sql`, `src/components/free-tool/PlaylistTab.tsx`

---

## Context

ADR-030 documenteerde drie gaps in de crash-recovery architectuur. Gap 1 bleef open:

De RPC `update_playlist_video_progress` zette `status='complete'` op het moment dat de laatste video werd verwerkt. De retry-pass (`process_playlist_retries`) werd 30 seconden later geënqueued — maar pas ná de status-update. Als de retry-pass daarna crashte, was de job onzichtbaar voor de watchdog (die zocht op `status='interrupted'`). Gefaalde `bot_detection`/`timeout` video's bleven permanent onverwerkt.

---

## Beslissing

Introduceer een niet-terminale tussenstatus `retry_pending` voor `playlist_extraction_jobs`.

### Statusovergang

```
running → (alle videos verwerkt)
  ↓
  Retryable failures? (bot_detection / timeout)
  │
  ├─ JA  → retry_pending   (RPC; retry-pass wordt geënqueued)
  │         ↓
  │         process_playlist_retries start → heartbeat update
  │         ↓
  │         complete  (retry-pass klaar: success of all-failed)
  │
  └─ NEE → complete  (RPC; direct klaar)
```

### Crash-recovery via watchdog

Watchdog Pass 1b detecteert `retry_pending` + stale heartbeat (>5 min):
- Als `last_heartbeat_at` None is: retry-pass startte nooit (enqueue-probleem of crash vóór start)
- Als `last_heartbeat_at` stale: retry-pass crashte mid-execution
- Beide gevallen: re-enqueue `process_playlist_retries` met `_job_id="{playlist_id}:retries"`

---

## Rationale

### Waarom niet een aparte tabel voor retry-state

Een aparte `playlist_retry_jobs` tabel zou de watchdog-query en job-lifecycle compliceren zonder extra informatiewaarde. De `retry_pending` status is voldoende — het is een tijdelijke toestand met een duidelijke transitie naar `complete`.

### Waarom de RPC de status bepaalt (niet de worker)

De RPC kent de volledige `video_results` op het moment van completion en kan atomisch checken of retryable failures bestaan. De worker zou na de RPC-call opnieuw de DB moeten lezen — een extra roundtrip en een race window. In de RPC is het één transactie.

### Waarom heartbeat (niet een retry_started_at kolom)

`last_heartbeat_at` wordt al elke 60s bijgewerkt door lopende jobs. Het hergebruiken voor stale-detectie van de retry-pass houdt het schema simpel. De watchdog-logica is identiek aan die voor `interrupted` jobs — bewezen patroon.

### Waarom geen Resume-banner in de frontend

Bij `retry_pending` draait de retry-pass al automatisch — de gebruiker hoeft niets te doen. Een "tap to resume" banner (zoals bij `running`) zou verwarring wekken. `PlaylistTab` auto-resumet bij `retry_pending` op mount zonder banner.

---

## Consequenties

- `playlist_extraction_jobs.status` krijgt een nieuw valid-value: `retry_pending`
  - Geen schema-wijziging nodig (TEXT kolom, geen CHECK constraint)
  - Frontend TERMINAL set in `useJobStatus.ts` is ongewijzigd (`retry_pending` is niet terminal)
- `process_playlist_retries` krijgt een verplichting: `status='complete'` zetten bij voltooiing
  - Breekt de impliciete aanname dat de RPC alles afhandelt
  - Documenteer dit als contract in de worker-functie
- Watchdog Pass 1b is uitgebreid — test via `test_playlist_retry_pending.py`
- Pre-launch flush: bestaande `retry_pending` rijen (uit vóór deze deploy) bestaan niet — geen migratie-probleem
