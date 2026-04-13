# Playlist Engine

## Overzicht

De playlist-engine extraheert transcripten voor meerdere YouTube-video's in één batch-operatie. De architectuur is volledig backend-gedreven: de Python backend beheert de job lifecycle, de frontend pollt de status.

Dit is Phase R in de roadmap ("Backend Playlist Orchestration").

---

## Job Lifecycle

```
Status flow: pending → running → completed / failed (partial)
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
        ├─ Start background task: asyncio.create_task(run_playlist_job(...))
        └─ Return {job_id} onmiddellijk

5. Frontend pollt GET /api/playlist/jobs/{job_id} elke 2 seconden
   └─ Next.js pollt Python: GET /api/playlist/jobs/{job_id}
        └─ Python leest uit Supabase:
             {status, completed, failed, total_videos,
              current_video_index, current_video_title, video_results}
        └─ Return progress naar frontend

6. Wanneer job klaar: status = 'completed'
   └─ video_results JSONB bevat per video_id:
        {status: 'success', transcript_id} of
        {status: 'error', error_type: 'members_only'|'no_captions'|...}
```

---

## Background Job Implementatie

`run_playlist_job()` in `backend/main.py:1249`:

```python
async def run_playlist_job(job_id: str, payload: dict) -> None:
    for idx, video_id in enumerate(video_ids):
        # Update voortgang in Supabase
        await update_playlist_job(current_video_index=idx, ...)
        
        if video_id in use_whisper_set:
            # Whisper path: audio-transcriptie via AssemblyAI
            whisper_job_id = str(uuid.uuid4())
            # Maak transcription_jobs rij aan
            # Wacht op run_whisper_job() (blocking within async)
        else:
            # Captions path: yt-dlp captions extractie
            result = await extract_with_ytdlp(video_id, use_proxy=True)
        
        # Sla transcript op in Supabase
        # Update video_results JSONB
        # completed/failed tellers bijhouden
    
    # Job klaar
    await update_playlist_job(status='completed', completed_at=...)
```

**Belangrijk:** De videos worden sequentieel verwerkt (niet parallel). Dit is bewuste keuze om YouTube rate-limits te respecteren.

---

## Database Schema

`playlist_extraction_jobs` tabel (uit `supabase/migrations/20260412_playlist_extraction_jobs.sql`):

```sql
id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid()
user_id               UUID    REFERENCES auth.users(id) ON DELETE CASCADE
status                TEXT    DEFAULT 'running'  -- 'running'|'completed'|'failed'
playlist_url          TEXT
playlist_title        TEXT
total_videos          INTEGER DEFAULT 0
completed             INTEGER DEFAULT 0
failed                INTEGER DEFAULT 0
current_video_index   INTEGER DEFAULT 0
current_video_title   TEXT    -- welke video wordt nu verwerkt
video_ids             JSONB   DEFAULT '[]'   -- array van video IDs
video_results         JSONB   DEFAULT '{}'   -- {video_id: {status, transcript_id|error_type}}
use_whisper_ids       JSONB   DEFAULT '[]'   -- subset van video_ids die Whisper gebruiken
collection_id         UUID    -- optioneel: groepeer in collection
processing_time_seconds INTEGER
created_at            TIMESTAMPTZ DEFAULT NOW()
completed_at          TIMESTAMPTZ
```

RLS: `"Users see own jobs"` — gebruikers zien alleen hun eigen jobs.

---

## Browser Recovery

Als de gebruiker tijdens een job de pagina refresht of sluit:
1. De job blijft draaien op de Python backend (Railway process)
2. Bij heropen: frontend haalt `job_id` op uit `sessionStorage`
3. Frontend hervat polling op `GET /api/playlist/jobs/{job_id}`
4. Voortgang is volledig herstelbaar uit Supabase

Dit is de sleutelreden voor polling i.p.v. SSE/WebSockets — zie [008](../decisions/008-polling-vs-websockets.md).

---

## Collections Integratie

Playlist-video's kunnen gegroepeerd worden in een **collection** (map in de bibliotheek):

- Bij aanmaak job: `collection_id` meegestuurd
- Backend koppelt elke succesvol transcript aan de collection: `UPDATE transcripts SET collection_id = ? WHERE id = ?`
- Collections schema: `supabase/migrations/20260305_collections.sql`

```sql
collections:
  id UUID, user_id UUID, name TEXT, created_at TIMESTAMPTZ

transcripts.collection_id → collections.id (ON DELETE SET NULL)
```

---

## Quota Systeem

Naast credits heeft de playlist-engine een aparte **playlist quota**:
- `playlist_quota_used` / `playlist_quota_remaining` / `quota_resets_at`
- Bijgehouden via `get_user_credits` RPC (retourneert ook quota info)
- Bedoeld om abuse te voorkomen (bijv. iemand die 1000 videos tegelijk queued)
- Exacte limiet en resetperiode: geconfigureerd in de `get_user_credits` RPC (niet in frontend code)
