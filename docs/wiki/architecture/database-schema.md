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

### `user_credits`
Canonieke credit-balance per gebruiker. Wordt atomisch geüpdated door `deduct_credits_atomic`, `add_credits` en `update_playlist_video_progress` RPC's.

```sql
user_id    UUID    PRIMARY KEY REFERENCES auth.users(id)
credits    INTEGER NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ DEFAULT now()
```

RLS: gebruiker ziet alleen eigen rij.

---

### `credit_transactions`
Audit-log van alle credit-mutaties. `user_credits.credits` is de canonieke balance; deze tabel dient uitsluitend als auditspoor.

```sql
id         UUID    PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID    REFERENCES auth.users(id)
amount     INTEGER NOT NULL  -- positief = toevoeging, negatief = aftrek
type       TEXT    NOT NULL DEFAULT 'debit'  -- 'debit' | 'credit'
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
status                TEXT    DEFAULT 'running'  -- 'running'|'complete'|'interrupted'
playlist_url          TEXT
playlist_title        TEXT
total_videos          INTEGER DEFAULT 0
completed             INTEGER DEFAULT 0
failed                INTEGER DEFAULT 0
current_video_index   INTEGER DEFAULT 0    -- legacy kolom (pre-ARQ era), niet meer geschreven
current_video_title   TEXT                 -- legacy kolom (pre-ARQ era), niet meer geschreven
video_ids             JSONB   DEFAULT '[]'   -- ["videoId1", "videoId2", ...]
video_results         JSONB   DEFAULT '{}'   -- {"videoId1": {status, transcript_id|error_type}}
use_whisper_ids       JSONB   DEFAULT '[]'   -- video IDs die Whisper gebruiken
collection_id         UUID
video_metadata        JSONB   DEFAULT '{}'   -- optionele video-metadata van frontend (migratie 20260430)
processing_time_seconds INTEGER
created_at            TIMESTAMPTZ DEFAULT NOW()
completed_at          TIMESTAMPTZ
last_progress_at      TIMESTAMPTZ            -- laatste video-update (migratie 20260428); NULL voor legacy jobs
last_heartbeat_at     TIMESTAMPTZ            -- Fase 4: worker-heartbeat elke 60s (migratie 20260430)
```

RLS: gebruiker ziet alleen eigen jobs.

---

### `transcription_jobs`
Tracking van individuele Whisper/AssemblyAI transcriptie jobs.

```sql
id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID    NOT NULL REFERENCES auth.users(id)
status                  TEXT    NOT NULL DEFAULT 'pending'  -- 'pending'|'downloading'|'transcribing'|'saving'|'complete'|'error'|'interrupted'
video_url               TEXT
source_type             TEXT    DEFAULT 'youtube'  -- 'youtube' | 'upload'
file_size_bytes         BIGINT  DEFAULT 0
file_format             TEXT    DEFAULT 'unknown'  -- 'youtube' | 'mp3' | 'ogg' | etc.
duration_seconds        INTEGER
credits_cost            INTEGER
transcript_id           UUID    -- REFERENCES transcripts(id) wanneer klaar
error_message           TEXT
error_type              TEXT    -- canonical error slug (members_only, timeout, etc.)
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
started_at              TIMESTAMPTZ
completed_at            TIMESTAMPTZ
processing_time_seconds INTEGER
credits_deducted        BOOLEAN DEFAULT false  -- Fase 4: idempotency-vlag voor worker-restart (migratie 20260430)
last_heartbeat_at       TIMESTAMPTZ            -- Fase 4: worker-heartbeat elke 60s (migratie 20260430)
```

RLS: gebruiker ziet alleen eigen jobs.

---

### `saved_videos`
Opgeslagen video-referenties per gebruiker (niet afhankelijk van extractie). Fase 4 migratie.

```sql
id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
video_id             TEXT        NOT NULL  -- YouTube video ID
title                TEXT
duration_seconds     INTEGER
channel              TEXT
thumbnail_url        TEXT
source               TEXT        DEFAULT 'manual'  -- 'manual' | 'playlist'
source_playlist_name TEXT
created_at           TIMESTAMPTZ DEFAULT NOW()
```

RLS: `CREATE POLICY "Users can CRUD own saved_videos" ON saved_videos FOR ALL USING (auth.uid() = user_id)`.
Index: `idx_saved_videos_user_id` op `(user_id)`.
Migratie: `20260430_fase4_saved_videos.sql`.

---

### `master_transcripts`
Cross-user persistente transcript cache. Metadata in Supabase, JSON-content in Cloudflare R2. Service-role only (geen user-facing RLS policies). Zie ADR-020 en ADR-021.

```sql
id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid()
video_id                 TEXT        NOT NULL
language                 TEXT        NOT NULL          -- taalcode ('en', 'nl', ...)
transcription_model      TEXT        NOT NULL          -- 'youtube_transcript_api' | 'youtube_captions' | 'assemblyai_universal_3' | ...
r2_key                   TEXT        NOT NULL          -- R2 object key: 'transcripts/{video_id}__{lang}__{model}.json'
source_method            TEXT        NOT NULL DEFAULT 'caption_extraction'  -- 'caption_extraction' | 'audio_transcription'
model_quality_rank       INTEGER                       -- handmatig beheerde ranking (zie master_cache.py:MODEL_QUALITY_RANK)
quality_score            FLOAT                         -- NULL voor caption-extracties
duration_seconds         INTEGER
character_count          INTEGER
word_count               INTEGER
fetched_from_provider_at TIMESTAMPTZ DEFAULT NOW()    -- wanneer transcript opgehaald bij YouTube/AssemblyAI
deprecated_at            TIMESTAMPTZ                   -- NULL = actief; gezet bij model-upgrade of privacy-verwijdering
created_at               TIMESTAMPTZ DEFAULT NOW()
UNIQUE (video_id, language, transcription_model)
```

RLS: ingeschakeld, geen policies — alleen `SUPABASE_SERVICE_ROLE_KEY` (Python backend) heeft toegang.  
Index: `idx_master_transcripts_lookup` op `(video_id, language, transcription_model) WHERE deprecated_at IS NULL`.  
Migratie: `20260428_master_transcripts_cache.sql`.

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

### `update_playlist_video_progress(p_playlist_id, p_video_id, p_status, p_transcript_id?, p_error_type?, p_amount?, p_reason?)`
Atomische per-video update voor de playlist chain pattern (ADR-025). Schrijft video-resultaat naar `video_results` JSONB, verhoogt de juiste counter (`completed` of `failed`), zet `last_progress_at = NOW()`, en markeert de playlist als `complete` zodra `completed + failed >= total_videos`.

**Fase 4:** Voert ook credit-deductie atomisch uit via `p_amount` (default `0`) en `p_reason`. Alleen bij `p_status='success'` en `NOT v_already_done`: UPDATE `user_credits` + INSERT `credit_transactions` in dezelfde transactie. Idempotent via `v_already_done`-check.

**Idempotent:** dubbele aanroep met identieke `p_video_id` + `p_status` verhoogt counters en trekt geen credits nogmaals af.

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

Migraties: `20260428_playlist_per_video_chain.sql` (oorspronkelijk), `20260430_fase4_update_playlist_progress_rpc.sql` (Fase 4 uitbreiding). Zie ADR-025.

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
| `20260428_playlist_per_video_chain.sql` | 2026-04-28 | `playlist_extraction_jobs.last_progress_at` + partial index + `update_playlist_video_progress` RPC (5-arg) |
| `20260428_playlist_progress_rpc_status_fix.sql` | 2026-04-28 | Fix: `status='completed'` → `status='complete'` in RPC |
| `20260428_master_transcripts_cache.sql` | 2026-04-28 | `master_transcripts` tabel + index + RLS (cross-user transcript cache) |
| `20260430_fase4_transcription_jobs.sql` | 2026-04-30 | Fase 4: `transcription_jobs.credits_deducted` + `last_heartbeat_at` |
| `20260430_fase4_playlist_extraction_jobs.sql` | 2026-04-30 | Fase 4: `playlist_extraction_jobs.last_heartbeat_at` + `video_metadata` |
| `20260430_fase4_update_playlist_progress_rpc.sql` | 2026-04-30 | Fase 4: RPC uitgebreid naar 7-arg (+ `p_amount`, `p_reason` voor atomische credit-deductie) |
| `20260430_fase4_saved_videos.sql` | 2026-04-30 | Fase 4: `saved_videos` tabel + RLS |
| `add_playlist_jobs.sql` | *(oud)* | Vroege `playlist_jobs` tabel (legacy, vervangen door `playlist_extraction_jobs`) |

---

## Legacy en Undocumented Tabellen

De volgende tabellen bestaan in de productie-DB maar zijn niet actief in de huidige codebase:

- **`playlist_jobs`** — vroege tracking-tabel voor playlist-jobs vóór de ARQ-refactor (Fase 3, 2026-04-28). Kolommen wijken af van `playlist_extraction_jobs`. Niet meer geschreven door de backend. Kandidaat voor cleanup post-launch.
- **`usage_logs`** — bevat `user_id`, `ip_address`, `video_id`, `extraction_type`, `success`, `credits_used`. Mogelijk aangemaakt door een vroege implementatie of Supabase-preset. Niet beschreven in ADR's; niet geschreven door huidige backend-code.
