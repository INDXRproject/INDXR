# Beslissing 030: Fase 4 — Crash-recovery zonder ack_late: wat we geleerd hebben

**Status:** Geaccepteerd (leerervaring)
**Datum:** 2026-04-30
**Gerelateerde code:** `backend/worker.py`, `backend/transcription_pipeline.py`, `backend/main.py`, `supabase/migrations/20260430_fase4_*.sql`

---

## Context

Fase 4 was gepland als de deploy van `ack_late=True` — een ARQ-parameter die ervoor zou zorgen dat een job pas uit de queue wordt verwijderd nadat de worker de taak succesvol heeft afgerond, in plaats van bij pickup. Dit was de geplande oplossing voor het probleem dat Railway-crashes in-flight jobs laten verdwijnen zonder recovery.

Tijdens implementatie ontdekten we dat `ack_late` niet bestaat.

---

## Wat we wilden bouwen

Het originele Fase 4-plan uit ADR-019:

1. `ack_late=True` in `WorkerSettings` — automatische herstart bij worker-crash
2. Idempotency keys op `transcription_jobs` zodat een hergestarte job geen dubbele credits aftrekt
3. Heartbeat-mechanisme zodat stale jobs detecteerbaar zijn

Het verwachte gedrag: als de Railway worker-container crasht midden in een job, pikt een nieuwe worker instantie de job automatisch op uit de queue.

---

## Wat we ontdekten

### ack_late bestaat niet in arq 0.28.0

Geverifieerd via broncodeanalyse (april 2026): `ack_late` komt niet voor in `arq.worker.Worker`, niet in `arq.connections`, niet in enige versie van de arq codebase. Het is een Celery-concept zonder equivalent in arq.

ARQ's gedrag: bij pickup van een job wordt de job DIRECT uit de queue verwijderd (`arq:in-progress:{job_id}` key wordt gezet met TTL=job_timeout+10s; de job wordt niet teruggezet bij crash). Dit is by design in arq.

### ARQ is in maintenance-only mode

Github issue #510 (python-arq/arq): de auteur gebruikt de library zelf nog maar er komen geen nieuwe features. `ack_late` was dus ook niet gepland.

### ARQ in-progress key mechanisme (bewezen via experiment)

Uit broncodeanalyse + experiment (`backend/scripts/experiment_arq_reenqueue.py`, april 2026):

```
Bij job-pickup schrijft ARQ:
  arq:job:{job_id}          — payload, TTL ~24u (gezet bij enqueue)
  arq:in-progress:{job_id}  — vlag, TTL = job_timeout + 10s (7210s bij onze config)

Bij succesvolle completion deletet ARQ:
  arq:job:{job_id}          — weg (bewijs: regel 563 arq/worker.py)
  arq:in-progress:{job_id}  — weg

Bij SIGKILL-crash blijven beide staan.
```

`enqueue_job()` met dezelfde `_job_id` na een crash:
- Checkt `pipe.exists(arq:job:{job_id}, arq:result:{job_id})`
- `arq:job:` bestaat nog → retourneert `None` (geblokkeerd)
- Job komt NIET opnieuw in de queue

### Bewezen watchdog-recept

Experiment 3b (lokaal geverifieerd) bewijst het juiste pad:

```python
# Watchdog-recept voor crashed job recovery:
await redis.delete(f'arq:job:{job_id}')
await redis.delete(f'arq:in-progress:{job_id}')
await pool.enqueue_job('run_whisper_job', ..., _job_id=job_id)
# → enqueue_job() retourneert Job object (niet None)
# → nieuwe worker pikt de job op
```

Alleen DEL-en van `arq:in-progress:` is niet voldoende — `arq:job:` blokkeert de `enqueue_job()` ook.

---

## Wat we daadwerkelijk gebouwd hebben

Vier lagen die samen de schade bij crashes beperken — géén automatische recovery, wél beperking van de gevolgen:

### M1: `credits_deducted` vlag op `transcription_jobs`

```sql
ALTER TABLE transcription_jobs ADD COLUMN credits_deducted BOOLEAN DEFAULT FALSE;
```

Migratie: `20260430_fase4_transcription_jobs.sql`

Werking: `do_assemblyai_transcription` schrijft `credits_deducted=True` direct na credit-aftrek (best-effort). Bij handmatige herstart checkt de worker deze vlag en slaat credit-aftrek over als `credits_deducted=True`. Fail-safe default: bij leesfout defaultt `already_deducted=True` (liever gratis dan dubbel).

### M2: `last_heartbeat_at` op beide job-tabellen

```sql
ALTER TABLE transcription_jobs ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE playlist_extraction_jobs ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
```

Migraties: `20260430_fase4_transcription_jobs.sql`, `20260430_fase4_playlist_extraction_jobs.sql`

### B1: Heartbeat-loop in transcription_pipeline.py

```python
async def _heartbeat_loop(heartbeat_fn, interval: int = 60) -> None:
    while True:
        await asyncio.sleep(interval)
        try:
            await heartbeat_fn()
        except Exception:
            pass

async def _run_with_heartbeat(awaitable, heartbeat_fn):
    if heartbeat_fn is None:
        return await awaitable
    task = asyncio.create_task(_heartbeat_loop(heartbeat_fn))
    try:
        return await awaitable
    finally:
        task.cancel()
```

Worker schrijft `last_heartbeat_at` elke 60 seconden naar Supabase tijdens langlopende stappen (audio-download, AssemblyAI transcriptie).

### B2: Stale-detectie in poll-endpoints (main.py)

```python
HEARTBEAT_STALE_SECS = 300  # 5 missed heartbeats

# In GET /api/jobs/{job_id} en GET /api/playlist/jobs/{job_id}:
if job['status'] == 'running' and job.get('last_heartbeat_at'):
    hb = datetime.fromisoformat(job['last_heartbeat_at'].replace('Z', '+00:00'))
    age = (datetime.now(timezone.utc) - hb).total_seconds()
    if age > HEARTBEAT_STALE_SECS:
        supabase.table('transcription_jobs').update({'status': 'interrupted'}).eq('id', job_id).execute()
        job['status'] = 'interrupted'
```

Legacy jobs (vóór Fase 4, `last_heartbeat_at IS NULL`) worden bewust overgeslagen — geen false-positives.

### M3: Atomische credit-deductie in update_playlist_video_progress RPC

```sql
-- Nieuw in Fase 4 (20260430_fase4_update_playlist_progress_rpc.sql):
IF NOT v_already_done AND p_status = 'success' AND p_amount > 0 THEN
    UPDATE user_credits SET credits = credits - p_amount WHERE user_id = v_job.user_id;
    INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (v_job.user_id, -p_amount, 'debit', p_reason, ...);
END IF;
```

Credit-aftrek voor playlist caption-videos zit nu in dezelfde DB-transactie als de `video_results` update. Geen race-window meer. `v_already_done`-check op `video_results` JSONB garandeert idempotency.

### B2: uuid5 deterministische Whisper job-IDs

```python
_WHISPER_NS = _uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
whisper_job_id = str(_uuid.uuid5(_WHISPER_NS, f"{playlist_id}:{video_id}"))
```

Stabiel over worker-restarts. `upsert(..., ignore_duplicates=True)` voorkomt DB-duplicaten bij replay.

---

## Wat we niet gebouwd hebben en waarom

### Watchdog cron job

Geparkeerd tot na launch. Rationale:
- Crashes zijn zeldzaam in de huidige productie-setup
- Complexiteit rechtvaardigt zich pas als er productie-data is over crash-frequentie
- De `interrupted`-status is nu zichtbaar voor de gebruiker — tijdelijke handmatige workaround via admin-dashboard is acceptabel
- Watchdog-recept is bewezen (zie experiment) maar implementatie vereist zorgvuldige beslissingen over refund-beleid, max-retries en het verschil tussen crashed vs. al-in-queue jobs

Zie backlog.md + de beslissingsanalyse in de sessie van 2026-04-30 (vier beslissingen uitgewerkt voor toekomstige implementatie).

### Frontend Resume-knop

Komt in de frontendsprints (F1-F4). Geblokkeerd op ontwerp — "interrupted"-state moet vertaald worden naar een duidelijke UX zonder false hope te wekken voor jobs die inhoudelijk gefaald zijn (bot_detection) vs. technisch gecrasht zijn.

---

## Welke gaps blijven

### Gap 1: Gecrasht retry-pass is onzichtbaar

De retry-pass (`process_playlist_retries`, `_job_id="{playlist_id}:retries"`) wordt alleen geënqueued nadat alle N originele videos verwerkt zijn. Op dat moment zet de RPC de playlist op `status='complete'`. Als de retry-pass daarna crasht:

- `playlist_extraction_jobs.status` is al `'complete'` — watchdog zoekt op `'running'`/`'interrupted'`, ziet niets
- Sommige `bot_detection`-video's blijven gefaald — gebruiker ziet `failed: 3` in de UI
- De retry-pass krijgt geen tweede kans via de watchdog

**Acceptabel als known limitation:** de retry-pass is best-effort (één poging, 30s delay). Bij crash: de gebruiker kan een nieuwe playlist-job starten voor de gefaalde video's.

### Gap 2: Automatische refund ontbreekt

Gebruikers betalen voor Whisper-jobs die crashen midden in transcriptie:
- Credits zijn afgetrokken (Step 4 in de pipeline, vóór AssemblyAI-call)
- `credits_deducted=True` is gezet
- Worker crasht bij Step 6 (AssemblyAI transcriptie)
- `finally`-block in `do_assemblyai_transcription` vuurт NIET bij SIGKILL

De `interrupted`-status is zichtbaar voor de gebruiker maar er is geen auto-refund. Handmatige refund via admin-dashboard is de tijdelijke workaround.

**Let op bij watchdog-implementatie:** als watchdog refundt én re-enqueued, en de re-run slaagt, dan krijgt de gebruiker een gratis transcriptie (omdat `credits_deducted=True` blijft staan en de tweede run `deduct_credits_on_success=False` gebruikt). Dit is by design ("liever gratis dan dubbel") maar moet gedocumenteerd zijn als revenue-implicatie.

### Gap 3: `idempotency_keys` tabel nooit aangemaakt

ADR-019 beschrijft een `idempotency_keys` Supabase-tabel als onderdeel van de Fase 4-deliverables. Deze tabel is nooit gemigreerd — niet aanwezig in de productie-DB (geverifieerd 2026-04-30). Het idempotency-probleem voor POST-endpoints bestaat nog. Huidige bescherming beperkt zich tot `deduct_credits_atomic` RPC (race-condition op rij-niveau) en de `credits_deducted` vlag (replay-bescherming voor de worker).

---

## Het re-enqueue experiment

Script: `backend/scripts/experiment_arq_reenqueue.py` + `backend/scripts/_exp_worker.py`
Status: aangemaakt, klaar om te draaien zodra lokale Redis beschikbaar is (`sudo apt install redis-server`).

**Bewezen uit ARQ-broncodeanalyse (zonder experiment nodig):**

| Experiment | Verwacht resultaat | Reden |
|---|---|---|
| Exp 1: re-enqueue lopende job | `enqueue_job()` → `None` | `arq:job:` key bestaat |
| Exp 2: re-enqueue na crash, geen DEL | `enqueue_job()` → `None` | `arq:job:` key blijft 24u staan |
| Exp 3a: alleen DEL `arq:in-progress:` | `enqueue_job()` → `None` | `arq:job:` blokkeert nog steeds |
| Exp 3b: DEL beide keys | `enqueue_job()` → `Job` object | Beide blockers weg — werkt |
| Exp 4: `keep_result=0` na voltooiing | `enqueue_job()` → `Job` object | Worker deleet `arq:job:` bij completion (worker.py:563) |

Experiment 3b is het kritieke bewijs: de watchdog moet `arq:job:{job_id}` EN `arq:in-progress:{job_id}` verwijderen vóór re-enqueue.

---

## Consequenties

**Positief:**
- Crashes worden binnen 5 minuten zichtbaar als `interrupted` status in de UI
- Geen dubbele credit-aftrek bij handmatige herstart (idempotency-vlaggen werken)
- Alle state leeft in Supabase — watchdog kan later worden toegevoegd zonder architectuurwijziging
- Watchdog-recept is bewezen en gedocumenteerd

**Negatief:**
- Geen automatische crash-recovery — gebruiker of operator moet handmatig handelen
- Gebruiker betaalt voor gecrasht Whisper-jobs zonder auto-refund
- `idempotency_keys` tabel nooit aangemaakt — bescherming ontbreekt op POST-endpoint niveau
- Gecrasht retry-pass is onzichtbaar voor toekomstige watchdog

**Volgende stap:**
Watchdog + refund-mechanisme bouwen na de launch, getriggerd door het eerste productie-incident waarin gebruikers gefrustreerd raken over interrupted jobs. Zie backlog.md en de beslissingsanalyse in de sessie van 2026-04-30.
