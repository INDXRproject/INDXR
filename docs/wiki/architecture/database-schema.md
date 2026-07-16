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
email_notifications  BOOLEAN NOT NULL DEFAULT true (migratie 20260701120000) -- opt-out voor user-gerichte e-mailmeldingen (admin-antwoorden op tickets)
library_page_size    INTEGER NOT NULL DEFAULT 50 CHECK IN (25,50,100) (migratie 20260704113930) -- transcripts per pagina in Library (server-side pagination)
stripe_customer_id   TEXT    (migratie 20260710154218) -- één Stripe Customer per user; UNIQUE partial index; gebruikt door checkout (payment attach) + on-demand factuurroute
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
title                    TEXT                          -- YouTube videotitel (gevuld bij alle writes — caption én audio_transcription; fix 2026-06-27)
channel                  TEXT                          -- YouTube kanaalnaam (gevuld bij alle writes — caption én audio_transcription; fix 2026-06-27)
fetched_from_provider_at TIMESTAMPTZ DEFAULT NOW()    -- wanneer transcript opgehaald bij YouTube/AssemblyAI
deprecated_at            TIMESTAMPTZ                   -- NULL = actief; gezet bij model-upgrade of privacy-verwijdering
created_at               TIMESTAMPTZ DEFAULT NOW()
UNIQUE (video_id, language, transcription_model)
```

RLS: ingeschakeld, geen policies — alleen `SUPABASE_SERVICE_ROLE_KEY` (Python backend) heeft toegang.  
Index: `idx_master_transcripts_lookup` op `(video_id, language, transcription_model) WHERE deprecated_at IS NULL`.  
Migraties: `20260428_master_transcripts_cache.sql` (initieel); `title` + `channel` kolommen toegevoegd 2026-06-27 via SQL Editor (`ALTER TABLE master_transcripts ADD COLUMN IF NOT EXISTS title TEXT; ADD COLUMN IF NOT EXISTS channel TEXT`).

---

### `support_tickets`
Contact- en supportverzoeken van gebruikers. INSERT alleen via `submit_support_ticket` RPC; geen directe INSERT-policy.

```sql
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
category      TEXT        NOT NULL CHECK IN ('feedback', 'billing', 'bug')
subject       TEXT        NOT NULL CHECK char_length BETWEEN 1 AND 200
body          TEXT        NOT NULL CHECK char_length BETWEEN 1 AND 5000
transcript_id UUID        REFERENCES public.transcripts(id) ON DELETE SET NULL
status        TEXT        NOT NULL DEFAULT 'open' CHECK IN ('open', 'closed')
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

RLS: gebruiker kan eigen tickets lezen (SELECT). Geen directe INSERT-policy — inserts verlopen via `submit_support_ticket()` RPC (SECURITY DEFINER).  
Migratie: `20260701000000_support_tickets.sql`.

---

### `messages`
In-app berichten per gebruiker. Systeem-gegenereerd via trigger of service role; geen user-INSERT-policy.

```sql
id         UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
title      TEXT        NOT NULL
body       TEXT        NOT NULL
type       TEXT        NOT NULL DEFAULT 'system'  -- 'welcome' | 'system' | 'support'
read       BOOLEAN     NOT NULL DEFAULT false
archived   BOOLEAN     NOT NULL DEFAULT false      -- (migratie 20260630170359)
ticket_id   UUID        REFERENCES public.support_tickets(id) ON DELETE CASCADE  -- NULL = inbox/systeem; NOT NULL = thread-bericht op ticket (migratie 20260701120000)
sender_role TEXT        NOT NULL DEFAULT 'admin' CHECK IN ('admin', 'user')      -- 'admin' = INDXR Support, 'user' = gebruiker-reply (migratie 20260701200000)
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

RLS: gebruiker kan eigen berichten lezen (SELECT) en updaten — `read` en `archived` — (UPDATE). Geen directe INSERT-policy — berichten worden aangemaakt via:
- `handle_new_user_message()` trigger (welkomstbericht)
- Admin-route `/api/admin/tickets/[id]/message` (service role, sender_role='admin')
- User-reply route `/api/support/tickets/[id]/reply` (service role, sender_role='user', na ownership + open-status check)

Index: `idx_messages_user_id` op `(user_id)`.  
Trigger: `on_auth_user_created_welcome_message` AFTER INSERT ON auth.users → `handle_new_user_message()`. Exception-safe: fout in trigger blokkeert nooit de signup.  
Migraties: `20260630164156_messages.sql` (tabel + trigger), `20260630170359_messages_archived.sql` (`archived`), `20260701120000_messages_ticket_id_email_pref.sql` (`ticket_id`), `20260701200000_messages_sender_role.sql` (`sender_role`).

---

## RPC Functies

### `submit_support_ticket(p_category, p_subject, p_body, p_transcript_id?)`
SECURITY DEFINER RPC voor het indienen van support-tickets. Enige toegestane INSERT-pad naar `support_tickets`.

**Checks (in volgorde):**
1. `auth.uid() IS NULL` → `not_authenticated`
2. Categorie niet in `('feedback','billing','bug')` → `invalid_category`
3. Subject buiten 1–200 tekens → `invalid_subject`
4. Body buiten 1–5000 tekens → `invalid_body`
5. Meer dan 5 tickets per rolling hour per user → `rate_limit_exceeded`
6. `transcript_id` opgegeven maar niet van caller → `transcript_not_found`

**Returns:** `uuid` (het nieuwe ticket-ID)

**Grants:** `EXECUTE` voor `authenticated`; `REVOKE` van `public` en `anon`.  
`SET search_path = public, pg_temp` (voorkomt search_path injection).  
Migratie: `20260701000000_support_tickets.sql`.

Gebruikt in: `apps/app/src/app/api/support/submit/route.ts`

---

### `get_user_credits(p_user_id UUID)`
Geeft creditsaldo en playlist-quota terug. **SECURITY DEFINER.**

**Toegang (sinds migratie `20260712204359_get_user_credits_own_only`):** een `authenticated` caller leest **alleen zijn eigen** saldo — de functie forceert `v_target := auth.uid()` en negeert `p_user_id`. Alleen `service_role` (Python-backend/admin, `auth.uid()` IS NULL) mag een andere user lezen via `p_user_id`. `anon`+`PUBLIC` hebben geen `EXECUTE`. Dit dicht het pre-launch privacy-lek waarbij een user andermans saldo kon opvragen — zie [auth-and-security.md](auth-and-security.md#rpc-execute-privileges-2026-07-11-adr-054).

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

## Migrations

### Huidige staat

**Baseline-squash uitgevoerd op 2026-06-30. Contactcentrum v1 migraties toegevoegd op 2026-07-01.**

`supabase/migrations/` bevat zes bestanden:
- `20260630155944_baseline.sql` — volledige DDL-snapshot productie-DB (bron van waarheid)
- `20260630164156_messages.sql` — `messages` tabel + `handle_new_user_message()` trigger
- `20260630170359_messages_archived.sql` — `archived BOOLEAN NOT NULL DEFAULT false` op `messages`
- `20260701000000_support_tickets.sql` — `support_tickets` tabel, `submit_support_ticket` RPC, RLS-policies
- `20260701120000_messages_ticket_id_email_pref.sql` — `messages.ticket_id` FK, `profiles.email_notifications`
- `20260701200000_messages_sender_role.sql` — `messages.sender_role TEXT NOT NULL DEFAULT 'admin' CHECK IN ('admin','user')`
- `20260704113930_profiles_library_page_size.sql` — `profiles.library_page_size INTEGER NOT NULL DEFAULT 50 CHECK IN (25,50,100)` (Library server-side pagination)
- `20260710154218_profiles_stripe_customer_id.sql` — `profiles.stripe_customer_id TEXT` + UNIQUE partial index (één Stripe Customer per user; checkout + on-demand factuurroute)

De 24 pre-baseline migratiebestanden zijn bewaard in `supabase/migrations_archive/` (git-geschiedenis blijft intact). De `supabase_migrations.schema_migrations` tracking-tabel bevat exact **zes** rijen.

**Herstelnet:** `supabase/migrations_archive/schema_migrations_backup_2026-06-30.sql` bevat de volledige 15-rij staat van vóór de reset.

### Pre-baseline chronologie (archief)

Voor de geschiedenis van de 24 pre-baseline migratiebestanden, zie `supabase/migrations_archive/`. Highlights:

| Periode | Wijziging |
|---------|-----------|
| 2026-03 | Basis-uitbreidingen: `avatar_color`, Tiptap velden, collections, `ai_summary`, `viewed_at`, `updated_at` |
| 2026-04-08 | `profiles.suspended`, backfill-profielen |
| 2026-04-12 | `playlist_extraction_jobs` tabel + RLS, job-metrics |
| 2026-04-22/23 | `profiles.rag_export_confirmed`, `rag_chunk_size` |
| 2026-04-28 | `master_transcripts` cache-tabel; `update_playlist_video_progress` RPC (5-arg → 7-arg) |
| 2026-04-30 | Fase 4: heartbeat-kolommen, `saved_videos`, credit-deductie in RPC |
| 2026-05-01 | `watchdog_attempts` op beide job-tabellen |
| 2026-05-02 | `retry_pending` status in RPC (ADR-030 Gap 1) |
| 2026-06-27 | `master_transcripts.title` + `.channel` via SQL Editor (buiten CLI-migraties) |

---

## Cost/usage capture-laag (2026-07-11, ADR-054)

Migraties `20260711100000`–`20260711100500`. Doel: kost-inputs per job/aankoop/user permanent vastleggen. Zie [ADR-054](../decisions/054-cost-usage-capture-layer.md).

### Nieuwe tabellen

- **`cost_config`** — runtime EUR-tarief-bron. Kolommen: `id`, `effective_from`, `currency` (CHECK `='EUR'`), `decodo_eur_per_gb`, `assemblyai_eur_per_min`, `deepseek_eur_per_1k_input_tokens` (= cache-MISS), `deepseek_eur_per_1k_cache_hit_tokens` (`numeric(18,10)`, cache-HIT), `deepseek_eur_per_1k_output_tokens`, `deepseek_peak_multiplier` (`numeric(6,4)`, default 1.0 — tijd-tarief-factor), `deepseek_peak_windows_utc` (jsonb, UTC-vensters waarin de multiplier geldt; NULL=geen), `fixed_monthly_infra_eur`, `usd_eur_rate`, `notes`, `created_at`. RLS aan, **geen policies** (service-role only). Lees "huidig" tarief = laatste `effective_from <= t`. Geseed 2026-07-11 (Decodo €2,99/GB, AssemblyAI €0,00322/min, USD→EUR @0,92; DeepSeek input-miss €0,000129/1k, cache-hit €0,000002576/1k, output €0,000258/1k — geverifieerd tegen officiële pricing; peak_multiplier 1,0/geen vensters, migratie `20260711214500`).
- **`daily_cost_counters`** — dag-grain aggregaat. `day` (PK), `caption_proxy_bytes` (bigint), `caption_count` (int), `updated_at`. Gevuld via RPC **`bump_caption_proxy_bytes(p_bytes)`** (SECURITY DEFINER, O(1) upsert) vanuit **beide** caption-routes bij cache-miss: de losse-video-route (`main.py`) én de playlist-route (`worker.py`, `20260711...` Blok C). Alleen de yt-dlp/VTT-tak (cascade step 2/3) is geïnstrumenteerd; step 1 (`youtube-transcript-api`) bytes blijven ongemeten. RLS aan, service-role only.

### Nieuwe kolommen

- **`transcription_jobs.proxy_bytes`** (bigint, nullable) — rauwe pre-ffmpeg Decodo-egress voor de YT-AI/whisper-route; gezet meteen na download (`transcription_pipeline.py`). `file_size_bytes` ongemoeid (upload-only, 0 voor YouTube).
- **`transcription_jobs.assemblyai_model`** (text, nullable) — effectief `speech_model_used`, gezet op completion.
- **`transcripts.ai_summary_usage`** (jsonb, nullable) — DeepSeek `{prompt_tokens, completion_tokens, total_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens, model, generated_at, deepseek_created}`. Cache-splitsing + server-UTC-timestamp (`deepseek_created`) → echte kost herrekenbaar via `cost_config` cache-tier + peak-multiplier, niet tokens×vast tarief (Blok B, 2026-07-11). Samenvatting blijft flat 3 credits; overschrijft bij regeneratie.
- **`user_credits.library_bytes`** (bigint NOT NULL default 0) — lopend totaal van de eigen bibliotheek-footprint (`transcript`+`edited_content`+`ai_summary`+`rag_exports` `octet_length`). Onderhouden door trigger; backfilled.
- **`user_credits.library_bytes_cap`** (bigint NOT NULL, default **104857600 = 100 MiB** per 2026-07-11 Blok F; was 5 GiB) — per-user placeholder-gratis-tier cap. **Fundering only — NIET gehandhaafd.** ⚠️ **Storage-toekomsttaak (benoemd):** enforcement + grandfather-logica (pre-launch heavy accounts, bv. ~191 MB, niet retroactief blokkeren) + credit-sink-UI ("X credits voor +MB") = aparte post-launch storage-monetisatietaak die een **prijsbeslissing** vereist. Zie [ADR-054](../decisions/054-cost-usage-capture-layer.md).
- **`profiles.signup_source`, `utm_source`, `utm_medium`, `utm_campaign`, `signup_referrer`, `signup_landing_path`** (text, nullable) — first-touch acquisitie.

### Gewijzigde/nieuwe functies + triggers

- **`add_credits(p_user_id, p_amount, p_reason, p_metadata, p_kind)`** — `p_kind` stempelt `credit_transactions.kind`. **Bijschrijf-kant (type='credit') = exact 3 kinds: `purchase` | `grant` | `refund`** (Blok E, 2026-07-11: `welcome`+legacy `bonus` teruggevouwen in `grant`; CHECK = `reservation|settlement|refund|purchase|grant`). **EXECUTE gelockt tot `service_role` only** (Blok A, `20260711170300`) — zie [auth-and-security.md](auth-and-security.md#rpc-execute-privileges-2026-07-11-adr-054).
- **`claim_welcome_reward`** — stempelt `kind='grant'`; `EXECUTE` = `authenticated`+`service_role`; `search_path` gepind.
- **RPC-privilege-lockdown (Blok A):** credit-muterende RPC's (`add_credits`/`reserve_credits`/`settle_credits`/`refund_credits`/`refund_credits_flat`/`update_playlist_video_progress`) zijn nu `service_role`-only; `deduct_credits_atomic` houdt `authenticated` (RAG-export eigen-aftrek). Details + regel in auth-and-security.md.
- **`transcripts_library_bytes_trigger()`** + triggers `transcripts_library_bytes_ins/del/upd` op `transcripts` (INSERT/DELETE/UPDATE OF content-kolommen) — onderhoudt `user_credits.library_bytes` (vangt álle insert-paden).
- **`handle_new_user_acquisition()`** + trigger `on_auth_user_created_acquisition` op `auth.users` — exception-safe upsert van acquisitie-kolommen uit `raw_user_meta_data` (blokkeert nooit signup; los van `handle_new_user`).

---

## Finance-tab capture + accrual (2026-07-15, ADR-059/060)

Migraties `20260714222523`–`20260714230120`. Periode-gebonden Finance-view + onherstelbare snapshot. Zie [ADR-059](../decisions/059-finance-snapshot-and-live-overlay.md) + [ADR-060](../decisions/060-accrual-cost-model-and-stripe-fee.md).

### Nieuwe tabellen
- **`finance_daily_snapshot`** — PK `(snapshot_date, scope)` (`scope ∈ external|internal`). Bevroren MEASURED-cijfers per Amsterdam-dag: flows (`cash_in`, `vat`, `revenue_delivered`, `stripe_fee`, `cor_*` ×5, `opex_funnel_loggedin/anon`, `opex_goodwill`, `net_profit_measured`, `credits_sold/consumed`) + stocks (`deferred_balance`, `outstanding_free_credits`, `storage_bytes`). Alles `numeric`. RLS aan, geen policies (service-role only). Gevuld door pg_cron 02:00 UTC.
- **`finance_settings`** — key/value config (`deferred_window_days` 30/60/90, `deferred_cost_overrides`, **`business_start_date`** = `"2026-01-01"` (F13, migratie `20260716200000`) — de "All time"-ondergrens + datepicker-floor, config-driven i.p.v. hardcoded in de tsx). RLS aan, geen policies.
- **`ai_summary_usage_log`** (F2, ADR-064) — insert-only per-run DeepSeek-tokenlog. `id` (PK), `transcript_id`→transcripts, `user_id`→auth.users, `generated_at`, `model`, `prompt_tokens`, `completion_tokens`, `cache_hit_tokens`, `created_at`. RLS aan met SELECT-policy "read own" (`user_id = auth.uid()`); writes service-role, COR-reads via `_geld_scope` (DEFINER). **Gezaghebbende AI-summary-COR-bron** op `generated_at` — `transcripts.ai_summary_usage` is niet meer de COR-bron. Backend appendt per summary-run (`backend/main.py`).
- **`proxy_usage_log`** (F18, ADR-066) — insert-only log van Decodo-proxy-egress die **niet** bij een geleverde job/caption hoort. `id` (PK), `occurred_at`, `category` (`playlist_info`|`metadata`|`caption_failed`), `bytes` (bigint). RLS aan, **geen policies** (anon/authenticated geweigerd; service-role backend schrijft/leest via bypass). Backend schrijft best-effort via `credit_manager.record_proxy_bytes`. Voedt de OPEX-regel "Proxy overhead" (`admin_finance_summary`, external-only globaal deel) samen met `transcription_jobs.proxy_bytes` van `status<>'complete'`-jobs (per scope). Disjunct van COR (`status='complete'`). Forward-only.
- **`service_metrics`** (F17, ADR-067) — één rij per externe dienst (`service` PK, nu alleen `deepseek`). `balance` (numeric, laatst-geslaagd), `currency`, `last_success_at`, `last_attempt_at`, `last_error`. RLS aan, **geen policies** (service-role only). Gevuld door `record_service_fetch`. Faalgedrag: bij fout blijft `balance`/`last_success_at` staan (laatst-goede), alleen `last_attempt_at`/`last_error` updaten → UI toont "unavailable" + tijdstip, nooit $0.
- **`decodo_daily_usage`** (F17, ADR-067) — per-dag Decodo gefactureerd verkeer. `day` (PK, date), `rx_bytes`, `tx_bytes`, `billed_bytes` (bigint), `fetched_at`. RLS aan, **geen policies** (service-role only). Nachtelijk ge-upsert door `fetch_service_metrics` (worker) uit `POST api.decodo.com/api/v2/statistics/traffic`. Voedt de Finance-reconciliatie (billed − measured = gat, external-only). Forward-only, geen backfill.
- **`daily_library_bytes`** (F3, ADR-064) — insert-only per-user dag-serie van `library_bytes`. PK `(day, user_id)` (`user_id`→auth.users), `library_bytes` (bigint), `created_at`. `snapshot_finance_day` schrijft per nacht de externe users (`ON CONFLICT DO UPDATE`). RLS aan met SELECT-policy "read own". `_geld_scope` leest hieruit de periode-stand voor storage-COR (terugval op stand-nu + `storage_approx` als de serie het venster niet dekt).

### Nieuwe kolommen
- **`credit_transactions.had_paid_at_time` / `is_internal_at_time`** (boolean, nullable) — point-in-time snapshot op ELKE debit via BEFORE INSERT-trigger `stamp_credit_debit_point_in_time` (B2, mirror van `usage_logs`; dekt alle 4 debit-paden zonder gelockte RPC te raken). Historische rijen NULL. Hot-path-index `idx_credit_transactions_user_type (user_id, type)`.
- **`transcription_jobs.cache_hit`** (boolean default false) — master-cache-hit → COR=0, credits wél gesettled (B2b, gezet in `transcription_pipeline.py`).
- **`transcription_jobs.source_kind`** (CHECK single|playlist|upload) + **`playlist_id`** (uuid) — bron-vlag bij aanmaak (B3, voedt Operations). Forward-only.
- **`usage_logs.source`** (CHECK single|playlist default single) — caption-herkomst (B3).
- **`opex_expenses`** — accrual-model: `amount`, `spread` (evenly|single), `recurrence` (none|monthly), `effective_from`, `effective_to` (NULL=lopend), `description`. Oude `eur`/`period` blijven (admin_geld_summary leest nog `sum(eur)`).

### Nieuwe/gewijzigde functies
- **`_geld_scope(p_internal, p_from, p_to)`** — range-aware (defaults -inf/+inf → byte-identiek aan oud). FLOWS op `[from,to)`, STOCKS/recognitie cumulatief-`<to`. **F15 (2026-07-16):** retourneert extra `drivers`-object (`ai_transcription.audio_seconds/proxy_bytes`, `caption.proxy_bytes`, `ai_summary.input/cache/output_tokens`, `storage.gb/free_gb/days_win/days_month`, `funnel_loggedin.proxy_bytes`) — de al-gemeten volumes achter elke COR-regel, puur additief (geen getal wijzigt). **F18 (2026-07-16, ADR-066):** retourneert `proxy_fail_bytes` = `Σ transcription_jobs.proxy_bytes WHERE status<>'complete'` (per scope) voor de Proxy-overhead-OPEX-regel.
- **`snapshot_finance_day(p_day)`** — idempotente dag-snapshot (DST-aware Amsterdam-daggrens). pg_cron-job `finance-daily-snapshot`. **F18:** nieuwe kolom `finance_daily_snapshot.opex_proxy_overhead` + `net_profit_measured` bevat proxy-overhead (failed-job + external globale `proxy_usage_log`); forward-only.
- **`opex_accrual(from,to)`** — snijdt entered-reeksen door de periode (jsonb: total/by_category/lines).
- **`admin_finance_summary(from,to)`** — live periode-RPC per scope: flows/stocks + bankbrug + cache-savings + deferred-schatting + honest `vat_computed` + entered-accrual (external-only). Alle nieuw: SECURITY DEFINER, REVOKE anon/authenticated, GRANT service_role. **F15 (2026-07-16):** bubbelt `_geld_scope.drivers` per scope door, aangevuld met `funnel_anon.proxy_bytes` (uit `daily_cost_counters`) + `goodwill.granted_credits` (verbruikt − purchased-verbruikt); top-level `rates` bevat nu ook de drie DeepSeek-token-tarieven. Puur additief voor de UI-driverweergave (`driver × tarief = bedrag`). **F18 (2026-07-16, ADR-066):** nieuwe OPEX-regel `measured_opex.proxy_overhead` = `(proxy_fail_bytes + proxy_global_bytes) × decodo`; globaal deel uit `proxy_usage_log` external-only; driver in `drivers.proxy_overhead` (`fail_bytes`/`global_bytes`/`total_bytes`/`by_category`). Telt in `total` + `net_profit`.
- **`log_caption_usage(...,p_source)`** — 7e DEFAULT-param voor `usage_logs.source`.
- **`record_service_fetch(p_service, p_ok, p_balance?, p_currency?, p_error?)`** (F17, ADR-067) — upsert in `service_metrics`. `p_ok=true` → zet `balance`/`currency`/`last_success_at`/`last_attempt_at`; `p_ok=false` → zet alleen `last_attempt_at`/`last_error` (behoudt laatst-goede saldo). SECURITY DEFINER, **`REVOKE EXECUTE FROM PUBLIC, anon, authenticated`** + GRANT service_role (default PUBLIC-grant-valkuil, LESSONS 2026-07-13). Aangeroepen door de worker-cron.
- **`admin_operations_summary()`** — **F17 (ADR-067):** extra `services.deepseek`-blok (`balance`/`currency`/`threshold` uit `cost_config.deepseek_low_balance_usd`/`status` ok|low|unavailable/`last_success_at`/`last_error`). Voedt de Operations "External services"-kaart.
- **`admin_finance_summary`** — **F17 (ADR-067):** extra `<scope>.reconciliation`-blok. External: vergelijkt `Σ decodo_daily_usage.billed_bytes` (periode) tegen álle gemeten proxy-bytes (jobs beide scopes + caption + `proxy_usage_log`); `gap_cost = GREATEST(0,gap)/1e9 × decodo` telt in `measured_opex.proxy_reconciliation` + `total`/`net`. `coverage_days=0` → status `unavailable`, gat/kost 0 (geen gefabriceerd gat). Internal: `{status:'not_applicable'}`.

---

## Legacy en Undocumented Tabellen

De volgende tabellen bestaan in de productie-DB (en in de baseline), maar zijn niet actief in de huidige codebase. Ze zijn **niet** verwijderd bij de baseline-squash — data aanraken is post-launch werk.

- **`playlist_jobs`** — vroege tracking-tabel voor playlist-jobs vóór de ARQ-refactor (Fase 3, 2026-04-28). Kolommen wijken af van `playlist_extraction_jobs`. Niet meer geschreven door de backend. **TODO post-launch:** `DROP TABLE public.playlist_jobs;` via nieuwe migratie nadat bevestigd is dat geen productiedata van waarde is.
- **`usage_logs`** — bevat `user_id`, `ip_address`, `video_id`, `extraction_type`, `success`, `credits_used`. Mogelijk aangemaakt door een vroege implementatie of Supabase-preset. Niet beschreven in ADR's; niet geschreven door huidige backend-code. **TODO post-launch:** evalueren of loggen hier herstart wordt of tabel gedropt wordt.
