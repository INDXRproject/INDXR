# Beslissing 019: ARQ via Upstash Redis voor Durable Job Queue

**Status:** Geaccepteerd
**Datum:** 2026-04-26
**Gerelateerde code:** `backend/main.py` (huidige `asyncio.create_task` orchestratie wordt vervangen), nieuwe `backend/worker.py` (ARQ worker), nieuwe `idempotency_keys` migratie

---

## Context

INDXR.AI heeft twee soorten langlopende async jobs in de Python backend:

1. **AssemblyAI audio-transcriptie** — duur afhankelijk van video-lengte, AssemblyAI verwerkt typisch sneller dan realtime maar download via proxy + ffmpeg-compressie + upload + transcriptie tellen op. Een 30-minuten video zit rond 1–3 minuten end-to-end, een 4-uur video kan 15–30 minuten kosten (`transcription_jobs` tabel)
2. **Playlist-extractie** — sequentiële verwerking van tot 500 video's, kan tientallen minuten tot uren lopen (`playlist_extraction_jobs` tabel)

De huidige implementatie in `backend/main.py:1249` (`run_playlist_job`) gebruikt `asyncio.create_task()` — jobs draaien in het FastAPI-proces zelf. `transcription_jobs` werkt vergelijkbaar.

Drie productie-realiteiten breken deze aanpak:

1. **Railway container-restarts killen alle in-flight jobs** zonder auto-recovery. Dit is gedocumenteerd in `operations/known-issues.md` onder "Bekende Beperkingen".
2. **Deploys via `git push` veroorzaken container-vervanging.** Elke deploy verliest lopende jobs.
3. **OOM-kills** bij yt-dlp + ffmpeg + audio-buffer combinaties zijn realistisch boven 512MB RAM.

Bij 500-video playlists die tientallen minuten lopen is dit statistisch een wekelijkse incident-bron na launch.

---

## Beslissing

**ARQ (async Redis Queue)** als durable job queue, draaiend op de bestaande Upstash Redis instance, met een aparte Railway worker-service naast de FastAPI API-service.

**Per-video decompositie:** een 500-video playlist wordt 500 onafhankelijke queue-jobs in plaats van één monolitische `run_playlist_job()`. Eén gefaalde video → één retry, niet de hele playlist opnieuw.

**Idempotency keys** op POST-endpoints (nieuwe Supabase-tabel `idempotency_keys` met `key`, `user_id`, `request_hash`, `cached_response`, TTL 24u) voorkomen duplicate submissions bij retries.

---

## Rationale

### Waarom ARQ en niet pgmq, Inngest, Trigger.dev of Temporal?

| Optie | Pro | Con | Verdict |
|---|---|---|---|
| **ARQ (Redis)** | Async-native, mature Python ecosysteem, leent op bestaande Upstash Redis | Tweede service op Railway (~$5–10/mnd) | **Gekozen** |
| pgmq (Postgres) | Geen extra infra, exactly-once delivery | Minder mature voor langlopende workflows; queue valt mee bij Supabase-incident | Afgewezen |
| Inngest / Trigger.dev | Volwassen developer experience | TypeScript-first, Python-paden minder volwassen | Afgewezen — verkeerde stack-fit |
| Temporal | Industriestandaard voor durable workflows | Operationeel zwaar (Postgres + workers + history), overkill voor deze schaal | Afgewezen — premature |

### Waarom één Redis voor drie doelen

De bestaande Upstash Redis instance (`indxr-redis`, Frankfurt eu-central-1) is ingericht voor rate limiting maar momenteel no-op tijdens de testfase (zie `operations/known-issues.md`). Bij launch wordt diezelfde Redis-instance uitgebreid voor drie taken: rate limiting + caption cache (zie priorities.md taak 1.4) + ARQ job queue. Eén managed instance is operationeel eenvoudiger dan drie aparte data-systemen.

### Waarom per-video decompositie

Een 500-video playlist als één job betekent: de hele job overleeft samen of sterft samen. Per-video jobs betekenen: 499 succesvolle videos plus 1 retry. Dit is fundamenteel voor stabiliteit bij bot-detection-incidents waar 5–10% van videos kan falen.

Belangrijk: video's blijven sequentieel verwerkt (één per twee tot drie seconden per proxy session) om YouTube rate-limits te respecteren. Dit blijft conform de huidige `run_playlist_job` aanpak — de queue beheert orchestratie en recovery, niet parallellisme.

### Waarom idempotency keys

Bij retries (Stripe webhook retry, frontend network retry, queue redrive) moet dezelfde request niet leiden tot dubbele credits-aftrek of dubbele jobs. Idempotency-key-pattern op POST-endpoints lost dit structureel op. De huidige `deduct_credits_atomic` RPC voorkomt race conditions binnen een request, maar niet dubbele requests.

---

## Architectuur

```
FastAPI API service (Railway, bestaand)
    ├─ POST /api/playlist/extract → enqueue 1 job per video → return job_id
    ├─ POST /api/transcribe/whisper → enqueue 1 transcription job → return job_id
    └─ GET /api/playlist/jobs/{id} → lees state uit Supabase

ARQ Worker service (Railway, nieuwe container)
    ├─ Pickt jobs uit Upstash Redis queue
    ├─ Verwerkt: yt-dlp cascade → AssemblyAI → DeepSeek → Supabase
    ├─ ack_late=True (job blijft in queue tot succesvolle Supabase commit)
    └─ Updates state in playlist_extraction_jobs / transcription_jobs
       (Realtime publiceert postgres_changes → frontend UI updates — zie ADR-022)
```

---

## Schema: idempotency_keys tabel

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  cached_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys (expires_at);
```

Cleanup via cron of Supabase pg_cron: `DELETE FROM idempotency_keys WHERE expires_at < NOW()`.

---

## Consequenties

**Voordelen:**
- Container-restart-safe: jobs overleven Railway-incidents en deploys
- Per-video granulariteit: gefaalde video sloopt niet de batch
- Schaalbaar door extra worker-replicas toevoegen wanneer load groeit
- Voorbereiding op VPS-migratie (Redis triviaal te self-hosten op Hetzner)

**Trade-offs:**
- Extra Railway-service ($5–10/mnd)
- Worker-deploy is aparte cycle van API-deploy
- ARQ heeft geen ingebouwde web UI — voor inspectie: redis-cli of bouw simpele admin-view

**Migratie-pad weg van ARQ:**
ARQ is geen vendor lock-in. Job-state staat in Supabase tabellen (`playlist_extraction_jobs`, `transcription_jobs`), niet in Redis. Redis is alleen het transport-mechanisme voor de queue. Bij latere keuze voor Temporal/Inngest blijft de state-laag intact.

**Toekomstige uitbreiding — retry van gefaalde videos:**
Per-video decompositie maakt het mogelijk om gefaalde videos uit een afgeronde playlist apart opnieuw te draaien. Concreet: na een 500-video playlist met 15 fails (zichtbaar in `video_results` JSONB), kan de gebruiker een "Retry failed" knop krijgen die alleen die 15 video-ID's opnieuw enqueued — zonder credits dubbel af te rekenen, zonder hele playlist te herhalen. Dit is bewust geen onderdeel van Fase 1 (priorities.md taak 1.5) maar wordt natuurlijk ondersteund door deze architectuur. Toegevoegd aan post-launch backlog.

**Impact op `architecture/playlist-engine.md`:**
Dat document beschrijft de huidige `asyncio.create_task` orchestratie. Bij implementatie van priorities.md taak 1.5 moet dat document bijgewerkt worden — een notitie aan het begin verwijst nu al naar dit ADR.