# Beslissing 019: ARQ via Upstash Redis voor Durable Job Queue

**Status:** Geaccepteerd
**Datum:** 2026-04-26 (herzien 2026-04-28)
**Gerelateerde code:** `backend/main.py` (huidige `asyncio.create_task` orchestratie wordt vervangen), nieuwe `backend/worker.py` (ARQ worker), nieuwe `idempotency_keys` migratie

---

## Context

INDXR.AI heeft twee soorten langlopende async jobs in de Python backend:

1. **AssemblyAI audio-transcriptie** — duur afhankelijk van video-lengte, AssemblyAI verwerkt typisch sneller dan realtime maar download via proxy + ffmpeg-compressie + upload + transcriptie tellen op. Een 30-minuten video zit rond 1–3 minuten end-to-end, een 4-uur video kan 15–30 minuten kosten (`transcription_jobs` tabel)
2. **Playlist-extractie** — sequentiële verwerking van typisch 8–40 video's (course content, niet music-playlists); max ~100 video's uitzonderlijk. Kan tientallen minuten lopen (`playlist_extraction_jobs` tabel)

De huidige implementatie in `backend/main.py` (`run_playlist_job`) gebruikt `asyncio.create_task()` — jobs draaien in het FastAPI-proces zelf. `transcription_jobs` werkt vergelijkbaar.

Drie productie-realiteiten breken deze aanpak:

1. **Railway container-restarts killen alle in-flight jobs** zonder auto-recovery. Dit is gedocumenteerd in `operations/known-issues.md` onder "Bekende Beperkingen".
2. **Deploys via `git push` veroorzaken container-vervanging.** Elke deploy verliest lopende jobs.
3. **OOM-kills** bij yt-dlp + ffmpeg + audio-buffer combinaties zijn realistisch boven 512MB RAM.

Bij playlists die tientallen minuten lopen is dit statistisch een incident-bron na launch.

---

## Beslissing

**ARQ (async Redis Queue)** als durable job queue, draaiend op de bestaande Upstash Redis instance, met een aparte Railway worker-service naast de FastAPI API-service.

**ARQ blijft ondanks maintenance mode.** In april 2026 is ontdekt dat ARQ in maintenance-only mode zit (github.com/python-arq/arq#510 — de auteur gebruikt het zelf nog maar er komen geen nieuwe features). De keuze is gemaakt ARQ te houden tot post-launch heroverweging om de volgende redenen:

- Fase 0–2 zijn al geverifieerd in productie — het transport-mechanisme werkt.
- Het échte probleem (monolithische lus, geen partial-completion-recovery) is library-onafhankelijk en wordt opgelost via per-video decompositie (zie ADR-025).
- Alle job-state leeft in Supabase, niet in Redis. Een library-swap is daardoor later een klein stuk werk (geschat 1–2 dagen) zonder architectuur-wijziging.

**Per-video decompositie via zelf-orchestrerende chain:** een playlist-job wordt N onafhankelijke video-jobs. Eén gefaalde video → één retry, niet de hele playlist opnieuw. Supabase `playlist_extraction_jobs` is single source of truth. Zie ADR-025 voor de volledige architectuurbeschrijving.

**Idempotency keys** op POST-endpoints (nieuwe Supabase-tabel `idempotency_keys` met `key`, `user_id`, `request_hash`, `cached_response`, TTL 24u) voorkomen duplicate submissions bij retries.

---

## Rationale

### Waarom ARQ en niet pgmq, Inngest, Trigger.dev of Temporal?

| Optie | Pro | Con | Verdict |
|---|---|---|---|
| **ARQ (Redis)** | Async-native, mature Python ecosysteem, leent op bestaande Upstash Redis, Fase 0–2 geverifieerd | Maintenance-only mode — zie sectie hieronder | **Gekozen** |
| pgmq (Postgres) | Geen extra infra, exactly-once delivery | Minder mature voor langlopende workflows; queue valt mee bij Supabase-incident | Afgewezen |
| Inngest / Trigger.dev | Volwassen developer experience | TypeScript-first, Python-paden minder volwassen | Afgewezen — verkeerde stack-fit |
| Temporal | Industriestandaard voor durable workflows | Operationeel zwaar (Postgres + workers + history), overkill voor deze schaal | Afgewezen — premature |

### Waarom niet migreren naar Taskiq, streaq of Procrastinate (april 2026)

Tijdens Fase 3 voorbereiding zijn drie alternatieve moderne async queue-libraries onderzocht:

**Taskiq**
Taskiq heeft een open graceful-shutdown bug (issue #447) die SIGTERM-handling op Railway rechtstreeks raakt. Dit is precies de use case die we willen oplossen. Niet bewezen op onze stack. Een migratie naar Taskiq midden in Fase 1 zou risico van halverwege ontdekken dat de library óók een mismatch heeft.

**streaq**
streaq is een jonge library (~2k LOC). Niet bewezen op productie-schaal. Het risico van onverwachte edge cases in een library die nog geen brede adoptie heeft is te groot voor pre-launch infrastructuur.

**Procrastinate**
Procrastinate gebruikt PostgreSQL als queue-backend. Dit verschuift queue-load naar dezelfde Supabase database die ook user-data draait. Connection-pool druk neemt toe. Voor onze use case — waar queue-volume relatief laag is maar gelijktijdige database-operaties al aanwezig zijn — is dit een ongewenste koppeling.

**Samenvatting:** Geen van de drie biedt een acuut voordeel boven ARQ voor onze huidige use case. Alle drie introduceren nieuwe onzekerheden. ARQ is bewezen te werken op onze stack (Fase 0–2). Library-keuze wordt opnieuw geëvalueerd post-launch met productie-data — zie sectie "Post-launch heroverweging".

**Andere opties:** Celery/Dramatiq zijn sync-first en mismatch met async FastAPI. BullMQ, Temporal, Inngest zijn architectuur-mismatch of TypeScript-only — zie ADR-026 voor het volledige vergelijkingsoverzicht.

### Waarom één Redis voor drie doelen

De bestaande Upstash Redis instance (`indxr-redis`, Frankfurt eu-central-1) is ingericht voor rate limiting maar momenteel no-op tijdens de testfase (zie `operations/known-issues.md`). Bij launch wordt diezelfde Redis-instance uitgebreid voor drie taken: rate limiting + caption cache (zie priorities.md taak 1.4) + ARQ job queue. Eén managed instance is operationeel eenvoudiger dan drie aparte data-systemen.

### Waarom per-video decompositie

De huidige `run_playlist_job` is één monolithische Python-lus die alle video's sequentieel verwerkt. Bij een crash bij video 25 is alle context weg — geen partial-completion-recovery. Per-video jobs betekenen: 39 succesvolle videos plus 1 retry. Dit is fundamenteel voor stabiliteit bij bot-detection-incidents waar 5–10% van videos kan falen.

Belangrijk: video's blijven sequentieel verwerkt (één per twee tot drie seconden per proxy session) om YouTube rate-limits te respecteren. De queue beheert orchestratie en recovery, niet parallellisme.

### Waarom idempotency keys

Bij retries (Stripe webhook retry, frontend network retry, queue redrive) moet dezelfde request niet leiden tot dubbele credits-aftrek of dubbele jobs. Idempotency-key-pattern op POST-endpoints lost dit structureel op. De huidige `deduct_credits_atomic` RPC voorkomt race conditions binnen een request, maar niet dubbele requests.

---

## Scope

**In scope (via ARQ):**
- YouTube Whisper-jobs (`source_type='youtube'`) → worker downloadt audio zelf via yt-dlp
- Playlist-extractie-jobs (captions + Whisper per video)

**Out of scope (blijft asyncio.create_task):**
- Audio upload-jobs (`source_type='upload'`) — audio-bytes zitten al in memory van het API-process, flow is kort (~2–5 min), Railway-restart-risico is laag. Bytes zijn niet serializable voor een queue zonder tussentijdse opslag. Besloten op 2026-04-27.

---

## Automatische crash-recovery: wat we hebben, wat ontbreekt

### Fase 2 verificatie ✅ 2026-04-27

- API-log: `ARQ pool initialized` na redeploy met `UPSTASH_REDIS_URL`
- Worker-log: `→ run_whisper_job(job_id='2c11e87d-...')` pickup en `← run_whisper_job ● (26.54s)` exit (video bao5kiMmXoU, 2 credits, 17 segmenten)
- API-log: géén `[job ...] Downloading` regels — verwerking volledig in worker-process
- Upload-pad: job fea97ef1 verwerkt in API-process (`indxr-backend` logger label), worker idle tijdens upload-job

### ack_late bestaat niet in ARQ

`ack_late` is een **Celery-concept** zonder equivalent in arq 0.28.0 (geverifieerd via broncodeanalyse april 2026; ook niet aanwezig in oudere versies). ARQ acknowledget altijd bij pickup — zodra een worker een job oppikt, verdwijnt die uit de queue. Bij worker-crash is de job verloren.

Dit betekent dat het originele plan voor Fase 4 ("zet `ack_late=True` aan") structureel niet uitvoerbaar is zonder library-swap.

### Wat Fase 4 wél heeft opgeleverd (april 2026)

Fase 4 heeft GEEN automatische crash-recovery, maar wel vier lagen die samen de schade beperken:

| Laag | Wat het doet | Bestand |
|------|-------------|---------|
| **Heartbeat** | Worker schrijft `last_heartbeat_at` elke 60s | `transcription_pipeline.py`, `worker.py` |
| **Stale-detectie** | Poll-endpoint markeert job `interrupted` na 300s zonder heartbeat | `main.py` (HEARTBEAT_STALE_SECS=300) |
| **Atomic credit-deductie** | Credit-aftrek zit in dezelfde DB-transactie als de voortgangsupdate — geen race-window | `update_playlist_video_progress` RPC (M3) |
| **Idempotency-vlaggen** | `credits_deducted` op `transcription_jobs`; `v_already_done` via `video_results` JSONB | M1, M3 migraties |

**Wat dit betekent in de praktijk:**
- Een crash wordt binnen 5 minuten zichtbaar in de frontend (status `interrupted`)
- Credits zijn nooit dubbel afgetrokken, ook niet bij handmatige herstart
- Bij handmatige herstart werkt de idempotency-bescherming correct
- Maar: er is géén automatische herstart — de gebruiker of operator moet handmatig handelen

### Drie paden naar echte automatische crash-recovery

**(a) Custom watchdog cron job (aanbevolen, laagste risico)**
Een ARQ cron job (`@cron(...)` in WorkerSettings) die elke ~2 minuten `interrupted` jobs uit Supabase ophaalt en opnieuw enqueued met hetzelfde deterministische `_job_id`. ARQ blokkeert duplicate enqueue van actieve jobs; de idempotency-vlaggen voorkomen dubbele credit-aftrek. Dit is volledig library-onafhankelijk en bouwt op de infrastructuur die Fase 4 al heeft gelegd.

**(b) Library-swap naar Taskiq of Procrastinate**
Taskiq heeft een open graceful-shutdown bug (issue #447, april 2026 — controleer status bij heroverweging). Procrastinate heeft visibility timeout ingebouwd. Migratie-werk: ~1–2 dagen, alle state blijft in Supabase. Zie ADR-026 voor vergelijking.

**(c) Frontend "Resume" knop voor user-driven retry**
Gebruiker ziet `interrupted` status en kan job hervatten via UI. Lagere prioriteit dan watchdog, maar goede aanvulling als vangnet voor jobs die watchdog mist.

**Aanbeveling:** Optie (a) + (c) gecombineerd. (a) handelt automatisch af; (c) geeft de gebruiker controle als fallback. Niet nu — parkeren tot na launch. Zie backlog.md.

---

## Architectuur

```
FastAPI API service (Railway, bestaand)
    ├─ POST /api/playlist/extract → maakt playlist_extraction_jobs rij aan
    │                               → enqueue EERSTE video-job (_job_id="{playlist_id}:0")
    │                               → return job_id direct
    ├─ POST /api/transcribe/whisper (youtube) → enqueue 1 transcription job → return job_id
    ├─ POST /api/transcribe/whisper (upload) → asyncio.create_task (bytes in memory, out of scope)
    └─ GET /api/playlist/jobs/{id} → lees state uit Supabase

ARQ Worker service (Railway, nieuwe container)
    ├─ Pickt jobs uit Upstash Redis queue
    ├─ process_playlist_video(playlist_id, video_index):
    │       1. Lees playlist state uit Supabase (videos[], video_index)
    │       2. Verwerk video (yt-dlp cascade → captions of Whisper)
    │       3. Atomic update via Supabase RPC (video_result, increment completed_count)
    │       4. Als video_index < total_videos - 1:
    │              enqueue process_playlist_video(_job_id="{playlist_id}:{video_index+1}")
    │          Anders: mark playlist als completed
    ├─ ack_late bestaat niet in arq — jobs worden altijd bij pickup verwijderd uit de queue
    └─ Updates state in playlist_extraction_jobs / transcription_jobs
       (Realtime publiceert postgres_changes → frontend UI updates — zie ADR-022)
```

---

## Per-video decompositie via deterministic `_job_id`

ARQ ondersteunt de `_job_id` parameter die enqueue-uniqueness garandeert totdat het resultaat is gewist. Dit benutten we voor idempotency op enqueue-niveau zonder dat we dat zelf hoeven te bouwen.

**Schema:** `_job_id = f"{playlist_id}:{video_index}"` — deterministisch, uniek per video per playlist.

**Voordeel:** dubbele enqueue van dezelfde video door een bug of race condition wordt door ARQ automatisch geblokkeerd. Een tweede `enqueue("process_playlist_video", _job_id="abc123:5")` terwijl die job al in de queue staat, wordt stilzwijgend genegeerd.

**Beperking:** `_job_id` uniqueness geldt alleen tot het resultaat is gewist (standaard 1 week). Voor replays van afgeronde playlists werkt dit correct omdat de resultaten dan al gewist zijn.

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
- Crashes worden binnen 5 min zichtbaar (heartbeat + stale-detectie, Fase 4)
- Credit-idempotency: geen dubbele aftrek bij handmatige herstart (Fase 4)
- Per-video granulariteit: gefaalde video sloopt niet de batch
- Schaalbaar door extra worker-replicas toevoegen wanneer load groeit
- Voorbereiding op VPS-migratie (Redis triviaal te self-hosten op Hetzner)

**Trade-offs:**
- Extra Railway-service ($5–10/mnd)
- Worker-deploy is aparte cycle van API-deploy
- ARQ heeft geen ingebouwde web UI — voor inspectie: redis-cli of bouw simpele admin-view

---

## Migratie-pad weg van ARQ

Library-keuze is een transport-mechanisme. Alle job-state leeft in Supabase tabellen (`playlist_extraction_jobs`, `transcription_jobs`, `idempotency_keys`), niet in Redis. Redis is alleen het transport-mechanisme voor de queue.

Bij latere keuze voor Taskiq, streaq, Procrastinate of een ander systeem:
- Architectuur blijft intact (per-video chain, deterministic job IDs, Supabase als state)
- Data blijft intact (alle state in Supabase)
- Alleen de library-aanroepen in `worker.py` en de `enqueue()`-calls in `main.py` wijzigen
- Geschat werk: 1–2 dagen voor de swap zelf

Geen vendor lock-in. De beslissing om bij ARQ te blijven is een pragmatische keuze op timing en risico, niet een technische afhankelijkheid.

**Impact op `architecture/playlist-engine.md`:**
Dat document beschrijft de huidige `asyncio.create_task` orchestratie. Bij implementatie van priorities.md taak 1.5 Fase 3 moet dat document bijgewerkt worden.

**Toekomstige uitbreiding — retry van gefaalde videos:**
Per-video decompositie maakt het mogelijk om gefaalde videos uit een afgeronde playlist apart opnieuw te draaien. Na een playlist met 5 fails (zichtbaar in `video_results` JSONB), kan de gebruiker een "Retry failed" knop krijgen die alleen die 5 video-ID's opnieuw enqueued — zonder credits dubbel af te rekenen, zonder hele playlist te herhalen. Toegevoegd aan post-launch backlog.

---

## Post-launch heroverweging

Library-keuze wordt geherevaleerd na launch wanneer we productie-data hebben. Relevante datapunten:

- Hoe vaak Railway restarts in-flight jobs raken (Railway incident log)
- Hoe vaak `ack_late=True` nodig is gebleken (ARQ retry-metrics)
- Of er ARQ-specifieke bugs optreden die ons blokkeren
- Hoe Taskiq en streaq zich ontwikkelen (open issues, release cadence)

**Trigger voor heroverweging:** eerste van:
- (a) Zes maanden post-launch
- (b) Een ARQ-specifieke bug die ons blokkeert
- (c) Een productie-incident dat een library-feature vereist die ARQ niet biedt

Bij heroverweging: kandidaten evalueren met productie-data — Taskiq (graceful shutdown bug check), streaq (rijpheid na ~6 maanden extra), Procrastinate (connection-pool impact meten). Migratie-werk geschat 1–2 dagen omdat alle state in Supabase leeft. Zie ook ADR-026.
