# Playlist Engine

## Overzicht

De playlist-engine extraheert transcripten voor meerdere YouTube-video's in één batch-operatie. De architectuur is volledig backend-gedreven: de Python backend beheert de job lifecycle via een ARQ-queue, de frontend pollt de status.

Zie [ADR-025](../decisions/025-per-video-decompositie.md) voor de architectuurkeuze (per-video decompositie) en [ADR-019](../decisions/019-arq-job-queue.md) voor de queue-implementatie (ARQ via Upstash Redis).

---

## Job Lifecycle

```
Status flow: running → complete / error (partial completion via video_results JSONB)
```

```
1. Gebruiker voert playlist URL in
2. Frontend: POST /api/playlist/info → preview van video's
3. Gebruiker selecteert video's + opties (Whisper ja/nee per video)
4. Frontend: POST /api/playlist/extract
   └─ Next.js stuurt door naar Python: POST /api/playlist/extract
        ├─ Maakt playlist_extraction_jobs rij aan in Supabase
        │    {id, user_id, status: 'running', playlist_url, total_videos,
        │     video_ids, use_whisper_ids, collection_id}
        ├─ Enqueued eerste video-job via ARQ:
        │    enqueue_job('process_playlist_video', playlist_id, 0,
        │                _job_id=f"{playlist_id}:0")
        └─ Return {job_id} onmiddellijk

5. Frontend pollt GET /api/playlist/jobs/{job_id} elke 2 seconden
   └─ Leest rechtstreeks uit Supabase:
        {status, completed, failed, total_videos, video_results}

6. Wanneer alle videos verwerkt: status = 'complete' (gezet door RPC)
   └─ video_results JSONB bevat per video_id:
        {status: 'success', transcript_id} of
        {status: 'error', error_type: 'members_only'|'bot_detection'|...}
```

---

## Per-video Chain Architectuur

### Orchestratie (Fase 3)

Elke video in de playlist wordt als een aparte ARQ-job verwerkt. De jobs vormen een zelf-orchestrerende keten:

```
process_playlist_video(playlist_id, video_index=0)
    → verwerkt video 0
    → update via update_playlist_video_progress RPC
    → enqueue process_playlist_video(playlist_id, 1, _job_id="{id}:1")

process_playlist_video(playlist_id, video_index=1)
    → verwerkt video 1
    → update via RPC
    → enqueue process_playlist_video(playlist_id, 2, _job_id="{id}:2")

... (sequentieel)

process_playlist_video(playlist_id, video_index=N-1)  ← laatste video
    → verwerkt video N-1
    → update via RPC (RPC zet status='complete' als completed+failed >= total)
    → als bot_detection/timeout failures: enqueue process_playlist_retries (30s delay)
    → anders: keten klaar
```

**Sequentialiteit:** video's worden één voor één verwerkt. Dit respecteert YouTube rate-limits. De queue beheert orchestratie en recovery, niet parallellisme.

**Deterministische `_job_id`:** `"{playlist_id}:{video_index}"` — garandeert dat dezelfde video niet twee keer tegelijk in de queue staat. Dubbele enqueues worden door ARQ stilzwijgend genegeerd.

**`keep_result=0`** op `process_playlist_video` en `process_playlist_retries`: voorkomt de 1-uur ARQ uniqueness-lock na completion. Alle state leeft in Supabase, niet in Redis.

### Idempotency

Als een video-job al `status='success'` heeft in `video_results` (bijv. door een dubbele enqueue), wordt de verwerking overgeslagen en gaat de chain door naar de volgende video.

### Retry-pass

Na de laatste video wordt gecontroleerd of er `bot_detection` of `timeout` fouten zijn. Als ja, wordt `process_playlist_retries` met 30 seconden vertraging geënqueued. Die task pakt de gefaalde video's sequentieel op en overschrijft hun result in Supabase via dezelfde RPC (idempotent).

---

## Video Verwerking (per video)

```python
# worker.py: process_playlist_video
1. Lees playlist state uit Supabase
2. Idempotency check (al 'success'? → skip)
3. Verwerk video:
   a. Captions pad (yt-dlp):
      - Eerste 3 videos (idx 0-2): gratis (geen credit-check, geen aftrek)
      - Video 4+: check balance ≥ 1, deduct 1 credit na succesvolle opslag
      - extract_with_ytdlp() → parse VTT → INSERT transcripts
   b. Whisper pad (AssemblyAI):
      - do_assemblyai_transcription() (youtube_utils + assemblyai_client)
      - Credits aftrekken op basis van audio-duur (ceil(seconds/60), min 1)
4. update_playlist_video_progress RPC (atomic JSONB update + completion check)
5. Enqueue volgende video of retry-pass
```

---

## Gedeelde Helpers

| Module | Rol |
|--------|-----|
| `backend/youtube_utils.py` | `get_proxy_url`, VTT-parsing, `extract_with_ytdlp` (caption-pad) |
| `backend/transcription_pipeline.py` | `do_assemblyai_transcription` (AssemblyAI-pad, gedeeld met standalone Whisper jobs) |
| `backend/worker.py` | ARQ-tasks: `process_playlist_video`, `process_playlist_retries`, `_process_caption_video` |

---

## Database Schema

`playlist_extraction_jobs` tabel:

```sql
id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid()
user_id               UUID    REFERENCES auth.users(id) ON DELETE CASCADE
status                TEXT    DEFAULT 'running'  -- 'running'|'complete'|'error'
playlist_url          TEXT
playlist_title        TEXT
total_videos          INTEGER DEFAULT 0
completed             INTEGER DEFAULT 0
failed                INTEGER DEFAULT 0
last_progress_at      TIMESTAMPTZ             -- bijgewerkt bij elke video-update
video_ids             JSONB   DEFAULT '[]'   -- array van video IDs (volgorde bepaalt index)
video_results         JSONB   DEFAULT '{}'   -- {video_id: {status, transcript_id|error_type}}
use_whisper_ids       JSONB   DEFAULT '[]'   -- subset van video_ids die Whisper gebruiken
collection_id         UUID    -- optioneel: groepeer in collection
processing_time_seconds INTEGER
created_at            TIMESTAMPTZ DEFAULT NOW()
completed_at          TIMESTAMPTZ
```

RLS: gebruikers zien alleen eigen jobs.

### RPC: `update_playlist_video_progress`

Atomische update per video (zie `supabase/migrations/20260428_playlist_per_video_chain.sql` + fix `20260428_playlist_progress_rpc_status_fix.sql`):

```sql
SELECT update_playlist_video_progress(
  p_playlist_id   UUID,
  p_video_id      TEXT,
  p_status        TEXT,           -- 'success' of 'error'
  p_transcript_id UUID    DEFAULT NULL,  -- bij success
  p_error_type    TEXT    DEFAULT NULL,  -- bij error
  p_amount        INTEGER DEFAULT 0,     -- Fase 4: credits te deduceren (0 = gratis)
  p_reason        TEXT    DEFAULT 'Playlist caption extraction'  -- Fase 4: audit-tekst
) RETURNS jsonb
-- {playlist_complete: bool, completed: int, failed: int, total: int}
```

**Fase 4 uitbreiding (migratie `20260430_fase4_update_playlist_progress_rpc.sql`):** credit-deductie zit nu atomisch in dezelfde DB-transactie als de `video_results` update. Alleen bij `p_status='success'` en `NOT v_already_done` en `p_amount > 0`.

Idempotent: dubbele aanroep met identieke `p_video_id` + `p_status` verhoogt counters niet en trekt credits niet opnieuw af. Triggert auto-completion (`status='complete'`) wanneer `completed + failed >= total_videos`.

---

## Browser Recovery

Als de gebruiker tijdens een job de pagina refresht of sluit:
1. De job-keten draait door op de ARQ worker (Railway)
2. Bij heropen: frontend haalt `job_id` op uit `sessionStorage`
3. Frontend hervat polling op `GET /api/playlist/jobs/{job_id}`
4. Voortgang is volledig herstelbaar uit Supabase (`video_results` JSONB)

---

## Collections Integratie

Playlist-video's kunnen gegroepeerd worden in een **collection**:

- Bij aanmaak job: `collection_id` opgeslagen in `playlist_extraction_jobs`
- Per video-job: `collection_id` doorgegeven aan `do_assemblyai_transcription` of `_process_caption_video`
- Backend koppelt transcript direct bij INSERT: `INSERT transcripts SET collection_id = ?`

---

## Quota Systeem

Naast credits heeft de playlist-engine een aparte **playlist quota**:
- Bijgehouden via `get_user_credits` RPC
- Exacte limiet en resetperiode: geconfigureerd in de RPC (niet in frontend code)
