# Database Schema

Supabase (PostgreSQL). Alle user-facing tabellen hebben RLS ingeschakeld.

---

## Tabellen

### `auth.users` (Supabase ingebouwd)
Beheert door Supabase Auth. Bevat email, provider metadata, created_at, etc.

---

### `profiles`
Uitbreiding op auth.users met applicatie-specifieke user data.

```sql
id                   UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
username             TEXT    -- display naam
role                 TEXT    -- 'user' | 'admin'
avatar_color         TEXT    -- hex kleur voor avatar placeholder (migratie 20260301)
suspended            BOOLEAN DEFAULT false (migratie 20260408)
rag_export_confirmed BOOLEAN DEFAULT false (migratie 20260422) -- vervallen, niet meer gebruikt (modal altijd tonen)
rag_chunk_size       INTEGER DEFAULT 60 CHECK IN (30,60,90,120) (migratie 20260422/20260423) -- chunk preset voor RAG JSON export
```

RLS: gebruiker kan alleen eigen profiel lezen/schrijven.

---

### `transcripts`
Opslag van alle getranscribeerde video's per gebruiker.

```sql
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE
title         TEXT        -- video titel
transcript    JSONB       -- [{text: string, offset: float, duration: float}]
video_id      TEXT        -- YouTube video ID (e.g. "dQw4w9WgXcQ")
video_url     TEXT        -- volledige YouTube URL
duration      FLOAT       -- video duur in seconden
ai_summary    JSONB       -- {text, action_points, generated_at, edited}  (migratie 20260306)
collection_id UUID        -- REFERENCES collections(id) ON DELETE SET NULL (migratie 20260305)
viewed_at     TIMESTAMPTZ -- laatste keer geopend (migratie 20260306)
updated_at    TIMESTAMPTZ -- laatste wijziging (migratie 20260307)
created_at    TIMESTAMPTZ DEFAULT now()

processing_method TEXT     -- 'youtube_captions' | 'assemblyai' — hoe het transcript is gegenereerd
channel           TEXT     -- YouTube kanaal naam (uploader) — opgeslagen bij captions en AssemblyAI jobs
language          TEXT     -- taalcode (bijv. 'en', 'nl') — yt-dlp of lingua detector
rag_exports       JSONB DEFAULT '[]' -- array van {chunk_size, exported_at, credits_spent} per RAG JSON export

-- Tiptap/edit veld (migraties 20260302, 20260304)
edited_content JSONB      -- Tiptap editor JSON state (opgeslagen bewerkte versie)
```

RLS: gebruiker ziet alleen eigen transcripts.  
Index: `idx_transcripts_collection_id`, `idx_transcripts_user_id` (impliciet via FK).

---

### `collections`
Mappen voor het organiseren van transcripts in de bibliotheek.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name       TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

RLS: gebruiker beheert alleen eigen collections.  
Index: `idx_collections_user_id`.

---

### `credit_transactions`
Audit log van alle credit-mutaties. Credits = `SUM(amount)` over alle rijen.

```sql
id         UUID    PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID    REFERENCES auth.users(id)
amount     INTEGER NOT NULL  -- positief = toevoeging, negatief = aftrek
reason     TEXT    NOT NULL  -- "Purchased 50 Credits", "AI Summarization", "Welcome Reward", etc.
metadata   JSONB   -- {stripe_session_id, amount_paid, currency, transcript_id, ...}
created_at TIMESTAMPTZ DEFAULT now()
```

RLS: gebruiker ziet alleen eigen transacties.

---

### `playlist_extraction_jobs`
Tracking van async playlist-extractie jobs.

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
current_video_title   TEXT
video_ids             JSONB   DEFAULT '[]'   -- ["videoId1", "videoId2", ...]
video_results         JSONB   DEFAULT '{}'   -- {"videoId1": {status, transcript_id|error_type}}
use_whisper_ids       JSONB   DEFAULT '[]'   -- video IDs die Whisper gebruiken
collection_id         UUID
processing_time_seconds INTEGER
created_at            TIMESTAMPTZ DEFAULT NOW()
completed_at          TIMESTAMPTZ
last_progress_at      TIMESTAMPTZ            -- laatste video-update (migratie 20260428); NULL voor legacy jobs
```

RLS: gebruiker ziet alleen eigen jobs.

---

### `transcription_jobs`
Tracking van individuele Whisper/AssemblyAI transcriptie jobs.

```sql
id              UUID    PRIMARY KEY
user_id         UUID    REFERENCES auth.users(id)
status          TEXT    -- 'pending'|'downloading'|'transcribing'|'saving'|'complete'|'error'
video_url       TEXT
source_type     TEXT    -- 'youtube' | 'upload'
file_size_bytes INTEGER
file_format     TEXT    -- 'youtube' | 'mp3' | 'ogg' | etc.
transcript_id   UUID    -- REFERENCES transcripts(id) wanneer klaar
error_message   TEXT
error_type      TEXT    -- canonical error slug (members_only, timeout, etc.)
created_at      TIMESTAMPTZ DEFAULT now()
```

RLS: gebruiker ziet alleen eigen jobs.

---

## RPC Functies

### `get_user_credits(p_user_id UUID)`
Geeft creditsaldo en playlist-quota terug.

**Returns:**
```json
[{
  "credits": 42,
  "playlist_quota_used": 2,
  "playlist_quota_remaining": 8,
  "quota_resets_at": "2026-05-01T00:00:00Z"
}]
```

Gebruikt in: `AuthContext.tsx:51`, `credit_manager.py:75`

---

### `deduct_credits_atomic(p_user_id, p_amount, p_reason, p_metadata)`
Atomische credit-aftrek met row-level locking.

**Returns:**
```json
{
  "success": true,
  "previous_balance": 42,
  "new_balance": 41,
  "error": null
}
```

Gebruikt in: `credit_manager.py:119`, `backend/main.py` (summarization)

---

### `update_playlist_video_progress(p_playlist_id, p_video_id, p_status, p_transcript_id?, p_error_type?)`
Atomische per-video update voor de playlist chain pattern (ADR-025). Schrijft video-resultaat naar `video_results` JSONB, verhoogt de juiste counter (`completed` of `failed`), zet `last_progress_at = NOW()`, en markeert de playlist als `complete` zodra `completed + failed >= total_videos`.

**Idempotent:** dubbele aanroep met identieke `p_video_id` + `p_status` verhoogt counters niet opnieuw.

**Returns:**
```json
{
  "playlist_complete": false,
  "completed": 1,
  "failed": 0,
  "total": 5
}
```

`p_status`: `'success'` of `'error'`. Bij success: `p_transcript_id` verplicht. Bij error: `p_error_type` verplicht.

Migratie: `20260428_playlist_per_video_chain.sql`. Zie ADR-025.

---

### `add_credits(p_user_id, p_amount, p_reason, p_metadata?)`
Voegt credits toe (aankoop, refund, admin).

Gebruikt in: `stripe/webhook/route.ts:53`, `credit_manager.py:168`

---

### `claim_welcome_reward(p_user_id)`
Idempotente welkomst-bonus (25 credits, eenmalig).

Gebruikt in: `src/app/actions/credits.ts`

---

## Migrations Chronologie

| Bestand | Datum | Wijziging |
|---------|-------|-----------|
| *(initieel)* | 2025-01 | Basis tabellen: auth.users, profiles, transcripts, credit_transactions, transcription_jobs |
| `20260301144045_add_avatar_color_to_profiles.sql` | 2026-03-01 | `profiles.avatar_color` kolom |
| `20260302_add_tiptap_fields.sql` | 2026-03-02 | Tiptap editor velden aan transcripts |
| `20260304_tiptap_fields_to_jsonb.sql` | 2026-03-04 | Tiptap velden migreren naar JSONB |
| `20260305_collections.sql` | 2026-03-05 | Collections tabel + `transcripts.collection_id` |
| `20260306000442_add_ai_summary_to_transcripts.sql` | 2026-03-06 | `transcripts.ai_summary` JSONB |
| `20260306_add_viewed_at_to_transcripts.sql` | 2026-03-06 | `transcripts.viewed_at` |
| `20260307_add_updated_at_to_transcripts.sql` | 2026-03-07 | `transcripts.updated_at` |
| `20260408_backfill_missing_profiles.sql` | 2026-04-08 | Backfill profielen voor bestaande users |
| `20260408_add_suspended_to_profiles.sql` | 2026-04-08 | `profiles.suspended` boolean |
| `20260412_playlist_extraction_jobs.sql` | 2026-04-12 | `playlist_extraction_jobs` tabel + RLS |
| `20260422_add_rag_settings_to_profiles.sql` | 2026-04-22 | `profiles.rag_export_confirmed` + `profiles.rag_chunk_size` |
| `20260412_job_metrics_and_rename.sql` | 2026-04-12 | Job metrics kolommen + rename |
| `20260423_rag_chunk_size_90.sql` | 2026-04-23 | `rag_chunk_size` CHECK constraint uitgebreid met waarde 90 |
| `20260428_playlist_per_video_chain.sql` | 2026-04-28 | `playlist_extraction_jobs.last_progress_at` + partial index + `update_playlist_video_progress` RPC |
| `add_playlist_jobs.sql` | *(oud)* | Vroege playlist jobs tabel (vervangen) |
