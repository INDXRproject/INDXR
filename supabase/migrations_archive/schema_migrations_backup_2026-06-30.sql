-- Backup van supabase_migrations.schema_migrations
-- Datum: 2026-06-30 | 15 rijen
-- Herstel: INSERT INTO supabase_migrations.schema_migrations VALUES (...)

BEGIN;

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260301144045',
    'add_avatar_color_to_profiles',
    ARRAY(SELECT jsonb_array_elements_text('["-- Add avatar_color column to profiles\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color text"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260302',
    'add_tiptap_fields',
    ARRAY(SELECT jsonb_array_elements_text('["-- Add Tiptap editor fields to transcripts table\nALTER TABLE transcripts\n  ADD COLUMN IF NOT EXISTS edited_content TEXT,\n  ADD COLUMN IF NOT EXISTS ai_summary TEXT"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260304',
    'tiptap_fields_to_jsonb',
    ARRAY(SELECT jsonb_array_elements_text('["-- Convert edited_content and ai_summary from TEXT to JSONB.\n-- Nullify all existing rows unconditionally \u2014 any stored HTML content is invalid JSONB anyway.\nUPDATE transcripts SET edited_content = NULL", "UPDATE transcripts SET ai_summary = NULL", "ALTER TABLE transcripts\n  ALTER COLUMN edited_content TYPE JSONB USING edited_content::jsonb,\n  ALTER COLUMN ai_summary TYPE JSONB USING ai_summary::jsonb"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260305',
    'collections',
    ARRAY(SELECT jsonb_array_elements_text('["-- Collections table for library organization\nCREATE TABLE IF NOT EXISTS collections (\n  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\n  name       TEXT NOT NULL,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n)", "-- Add collection_id to transcripts (nullable \u2014 transcripts without one appear in \"All Transcripts\")\nALTER TABLE transcripts\n  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL", "-- RLS: users can only access their own collections\nALTER TABLE collections ENABLE ROW LEVEL SECURITY", "CREATE POLICY \"Users can manage own collections\"\n  ON collections\n  FOR ALL\n  USING (auth.uid() = user_id)\n  WITH CHECK (auth.uid() = user_id)", "-- Index for fast look-ups\nCREATE INDEX IF NOT EXISTS idx_transcripts_collection_id ON transcripts(collection_id)", "CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id)"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260306',
    'add_viewed_at_to_transcripts',
    ARRAY(SELECT jsonb_array_elements_text('["-- Add viewed_at column to transcripts for ''New'' badge tracking\nALTER TABLE transcripts ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL", "-- Index for performance\nCREATE INDEX IF NOT EXISTS transcripts_viewed_at_idx ON transcripts(viewed_at)"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260306000442',
    'add_ai_summary_to_transcripts',
    ARRAY(SELECT jsonb_array_elements_text('["-- Add AI summary column to transcripts table\nALTER TABLE public.transcripts\nADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260307',
    'add_updated_at_to_transcripts',
    ARRAY(SELECT jsonb_array_elements_text('["-- Add updated_at column to transcripts for tracking last modification time\nALTER TABLE transcripts \nADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()", "-- Backfill existing rows: set updated_at = created_at where null\nUPDATE transcripts SET updated_at = created_at WHERE updated_at IS NULL", "-- Index for performance (ordering by modified date)\nCREATE INDEX IF NOT EXISTS transcripts_updated_at_idx ON transcripts(updated_at DESC)"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    NULL,
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260428062726',
    'playlist_progress_rpc_status_fix',
    ARRAY(SELECT jsonb_array_elements_text('["-- Fix: status ''completed'' \u2192 ''complete'' in update_playlist_video_progress\n-- Reden: frontend PlaylistTab.tsx checkt status === ''complete'' (bestaande conventie).\n-- De eerste migratie (20260428_playlist_per_video_chain.sql) schreef ''completed'' \u2014 incorrect.\n-- Datum: 2026-04-28\n\nCREATE OR REPLACE FUNCTION update_playlist_video_progress(\n  p_playlist_id  UUID,\n  p_video_id     TEXT,\n  p_status       TEXT,\n  p_transcript_id UUID DEFAULT NULL,\n  p_error_type   TEXT DEFAULT NULL\n) RETURNS jsonb\nLANGUAGE plpgsql\nSECURITY DEFINER\nAS $$\nDECLARE\n  v_job           playlist_extraction_jobs%ROWTYPE;\n  v_existing      jsonb;\n  v_new_entry     jsonb;\n  v_already_done  boolean := false;\n  v_new_completed integer;\n  v_new_failed    integer;\n  v_is_complete   boolean;\nBEGIN\n  SELECT * INTO v_job\n  FROM playlist_extraction_jobs\n  WHERE id = p_playlist_id\n  FOR UPDATE;\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION ''playlist_extraction_jobs rij niet gevonden: %'', p_playlist_id;\n  END IF;\n\n  v_existing := v_job.video_results -> p_video_id;\n  IF v_existing IS NOT NULL AND (v_existing ->> ''status'') = p_status THEN\n    v_already_done := true;\n  END IF;\n\n  IF p_status = ''success'' THEN\n    v_new_entry := jsonb_build_object(\n      ''status'',        ''success'',\n      ''transcript_id'', p_transcript_id\n    );\n  ELSE\n    v_new_entry := jsonb_build_object(\n      ''status'',      ''error'',\n      ''error_type'',  p_error_type\n    );\n  END IF;\n\n  IF v_already_done THEN\n    v_new_completed := v_job.completed;\n    v_new_failed    := v_job.failed;\n  ELSE\n    IF p_status = ''success'' THEN\n      v_new_completed := v_job.completed + 1;\n      v_new_failed    := v_job.failed;\n    ELSE\n      v_new_completed := v_job.completed;\n      v_new_failed    := v_job.failed + 1;\n    END IF;\n  END IF;\n\n  v_is_complete := (v_new_completed + v_new_failed) >= v_job.total_videos;\n\n  UPDATE playlist_extraction_jobs SET\n    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),\n    completed        = v_new_completed,\n    failed           = v_new_failed,\n    last_progress_at = NOW(),\n    status           = CASE WHEN v_is_complete THEN ''complete'' ELSE status END,\n    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,\n    processing_time_seconds = CASE\n      WHEN v_is_complete\n      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer\n      ELSE processing_time_seconds\n    END\n  WHERE id = p_playlist_id;\n\n  RETURN jsonb_build_object(\n    ''playlist_complete'', v_is_complete,\n    ''completed'',         v_new_completed,\n    ''failed'',            v_new_failed,\n    ''total'',             v_job.total_videos\n  );\nEND;\n$$;\n\nCOMMENT ON FUNCTION update_playlist_video_progress IS\n  ''Atomic per-video progress update for playlist chain pattern. ''\n  ''Zie ADR-025. Idempotent: dubbele aanroep met identieke args ''\n  ''verhoogt counters niet. Triggert auto-completion (status=''''complete'''') ''\n  ''wanneer completed + failed >= total_videos.'';"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260428121044',
    'master_transcripts_cache',
    ARRAY(SELECT jsonb_array_elements_text('["CREATE TABLE master_transcripts (\n  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  video_id                 TEXT NOT NULL,\n  language                 TEXT NOT NULL,\n  transcription_model      TEXT NOT NULL,\n  r2_key                   TEXT NOT NULL,\n  source_method            TEXT NOT NULL DEFAULT ''caption_extraction'',\n  model_quality_rank       INTEGER,\n  quality_score            FLOAT,\n  duration_seconds         INTEGER,\n  character_count          INTEGER,\n  word_count               INTEGER,\n  fetched_from_provider_at TIMESTAMPTZ DEFAULT NOW(),\n  deprecated_at            TIMESTAMPTZ,\n  created_at               TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE (video_id, language, transcription_model)\n);\n\nCREATE INDEX idx_master_transcripts_lookup\n  ON master_transcripts (video_id, language, transcription_model)\n  WHERE deprecated_at IS NULL;\n\nALTER TABLE master_transcripts ENABLE ROW LEVEL SECURITY;"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260430060438',
    'fase4_transcription_jobs',
    ARRAY(SELECT jsonb_array_elements_text('["-- Fase 4: transcription_jobs uitbreiden\n-- credits_deducted: idempotency vlag \u2014 TRUE zodra credits zijn afgetrokken voor deze job.\n--   Bij worker-restart (ack_late=True) controleert run_whisper_job deze vlag om dubbele\n--   aftrek te voorkomen.\n-- last_heartbeat_at: pipeline schrijft elke ~60s tijdens download + AssemblyAI-call.\n--   GET /api/jobs/{id} markeert job als ''interrupted'' als heartbeat > 3 min oud is.\n\nALTER TABLE transcription_jobs\n  ADD COLUMN IF NOT EXISTS credits_deducted  BOOLEAN    DEFAULT FALSE,\n  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260430060441',
    'fase4_playlist_extraction_jobs',
    ARRAY(SELECT jsonb_array_elements_text('["-- Fase 4: playlist_extraction_jobs uitbreiden\n-- last_heartbeat_at: worker schrijft elke ~60s tijdens video-verwerking.\n--   GET /api/playlist/jobs/{id} markeert job als ''interrupted'' als heartbeat > 3 min oud.\n-- video_metadata: gevuld bij aanmaak vanuit PlaylistInfoResponse.entries.\n--   Structuur: {\"video_id\": {\"title\": \"...\", \"duration\": 123.4, \"thumbnail\": \"...\"}}\n--   Gebruikt door de wrap-up UI om gefaalde videos bij naam te tonen.\n\nALTER TABLE playlist_extraction_jobs\n  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS video_metadata    JSONB DEFAULT ''{}'';"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260430060557',
    'fase4_update_playlist_progress_rpc',
    ARRAY(SELECT jsonb_array_elements_text('["-- Fase 4: update_playlist_video_progress RPC uitbreiden met credit-idempotency\n-- Drop de oude 5-arg overload zodat er geen ambigu\u00efteit is bij GRANT.\n\n-- \u2500\u2500\u2500 0. Drop oude signature \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nDROP FUNCTION IF EXISTS update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT);\n\n\n-- \u2500\u2500\u2500 1. RPC aanmaken (nieuwe 7-arg signature) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nCREATE OR REPLACE FUNCTION update_playlist_video_progress(\n  p_playlist_id   UUID,\n  p_video_id      TEXT,\n  p_status        TEXT,\n  p_transcript_id UUID    DEFAULT NULL,\n  p_error_type    TEXT    DEFAULT NULL,\n  p_amount        INTEGER DEFAULT 0,\n  p_reason        TEXT    DEFAULT ''Playlist caption extraction''\n) RETURNS jsonb\nLANGUAGE plpgsql\nSECURITY DEFINER\nAS $$\nDECLARE\n  v_job           playlist_extraction_jobs%ROWTYPE;\n  v_existing      jsonb;\n  v_new_entry     jsonb;\n  v_already_done  boolean := false;\n  v_new_completed integer;\n  v_new_failed    integer;\n  v_is_complete   boolean;\nBEGIN\n  SELECT * INTO v_job\n  FROM playlist_extraction_jobs\n  WHERE id = p_playlist_id\n  FOR UPDATE;\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION ''playlist_extraction_jobs rij niet gevonden: %'', p_playlist_id;\n  END IF;\n\n  v_existing := v_job.video_results -> p_video_id;\n  IF v_existing IS NOT NULL AND (v_existing ->> ''status'') = p_status THEN\n    v_already_done := true;\n  END IF;\n\n  IF NOT v_already_done AND p_status = ''success'' AND p_amount > 0 THEN\n    UPDATE user_credits\n    SET credits    = credits - p_amount,\n        updated_at = NOW()\n    WHERE user_id = v_job.user_id;\n\n    INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)\n    VALUES (\n      v_job.user_id,\n      -p_amount,\n      ''debit'',\n      p_reason,\n      jsonb_build_object(''playlist_id'', p_playlist_id, ''video_id'', p_video_id)\n    );\n  END IF;\n\n  IF p_status = ''success'' THEN\n    v_new_entry := jsonb_build_object(\n      ''status'',        ''success'',\n      ''transcript_id'', p_transcript_id\n    );\n  ELSE\n    v_new_entry := jsonb_build_object(\n      ''status'',     ''error'',\n      ''error_type'', p_error_type\n    );\n  END IF;\n\n  IF v_already_done THEN\n    v_new_completed := v_job.completed;\n    v_new_failed    := v_job.failed;\n  ELSE\n    IF p_status = ''success'' THEN\n      v_new_completed := v_job.completed + 1;\n      v_new_failed    := v_job.failed;\n    ELSE\n      v_new_completed := v_job.completed;\n      v_new_failed    := v_job.failed + 1;\n    END IF;\n  END IF;\n\n  v_is_complete := (v_new_completed + v_new_failed) >= v_job.total_videos;\n\n  UPDATE playlist_extraction_jobs SET\n    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),\n    completed        = v_new_completed,\n    failed           = v_new_failed,\n    last_progress_at = NOW(),\n    status           = CASE WHEN v_is_complete THEN ''complete'' ELSE status END,\n    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,\n    processing_time_seconds = CASE\n      WHEN v_is_complete\n      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer\n      ELSE processing_time_seconds\n    END\n  WHERE id = p_playlist_id;\n\n  RETURN jsonb_build_object(\n    ''playlist_complete'', v_is_complete,\n    ''completed'',         v_new_completed,\n    ''failed'',            v_new_failed,\n    ''total'',             v_job.total_videos\n  );\nEND;\n$$;\n\n\n-- \u2500\u2500\u2500 2. Grants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nGRANT EXECUTE ON FUNCTION update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT)\n  TO authenticated, service_role;\n\n\n-- \u2500\u2500\u2500 3. Documentatie \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nCOMMENT ON FUNCTION update_playlist_video_progress IS\n  ''Atomic per-video progress update for playlist chain pattern. Zie ADR-025. ''\n  ''Fase 4: credit-deductie (p_amount, p_reason) zit nu in de RPC \u2014 atomisch ''\n  ''met video_results update, idempotent via v_already_done check. ''\n  ''Triggert auto-completion (status=''''complete'''') wanneer completed + failed >= total_videos.'';"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260430060615',
    'fase4_saved_videos',
    ARRAY(SELECT jsonb_array_elements_text('["-- Fase 4: saved_videos tabel\n-- Gebruikers kunnen gefaalde playlist-videos (of handmatig gekozen videos) opslaan\n-- voor een latere transcriptie-batch. Zie F2 (wrap-up UX) en F4 (dashboard SavedVideosSection).\n--\n-- source: ''manual'' (gebruiker kiest zelf) of ''playlist_failure'' (automatisch vanuit wrap-up).\n-- source_playlist_name: alleen gevuld bij source = ''playlist_failure''.\n\n-- \u2500\u2500\u2500 1. Tabel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nCREATE TABLE saved_videos (\n  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\n  video_id             TEXT        NOT NULL,\n  title                TEXT        NOT NULL,\n  duration_seconds     INTEGER,\n  channel              TEXT,\n  thumbnail_url        TEXT,\n  source               TEXT        NOT NULL DEFAULT ''manual'',\n  source_playlist_name TEXT,\n  created_at           TIMESTAMPTZ DEFAULT NOW()\n);\n\n\n-- \u2500\u2500\u2500 2. Index \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nCREATE INDEX idx_saved_videos_user_id ON saved_videos (user_id);\n\n\n-- \u2500\u2500\u2500 3. RLS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY \"Users can CRUD own saved_videos\"\n  ON saved_videos FOR ALL\n  USING (auth.uid() = user_id);"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260501222341',
    'watchdog_attempts',
    ARRAY(SELECT jsonb_array_elements_text('["ALTER TABLE transcription_jobs\n  ADD COLUMN IF NOT EXISTS watchdog_attempts INTEGER DEFAULT 0;\n\nALTER TABLE playlist_extraction_jobs\n  ADD COLUMN IF NOT EXISTS watchdog_attempts INTEGER DEFAULT 0;"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rollback, created_by, idempotency_key) VALUES (
    '20260502024830',
    '20260502_playlist_retry_pending_status',
    ARRAY(SELECT jsonb_array_elements_text('["-- ADR-030 Gap 1 fix: introduce ''retry_pending'' status for playlist jobs.\n--\n-- When all videos are processed but retryable failures exist (bot_detection,\n-- timeout), the RPC now sets status=''retry_pending'' instead of ''complete''.\n-- The retry-pass (process_playlist_retries) sets status=''complete'' when done.\n-- This makes crashed retry-passes visible to the watchdog via stale heartbeat.\n--\n-- Also adds ''should_retry'' to the return payload so the worker can decide\n-- whether to enqueue process_playlist_retries without re-reading the job.\n\nCREATE OR REPLACE FUNCTION update_playlist_video_progress(\n  p_playlist_id   UUID,\n  p_video_id      TEXT,\n  p_status        TEXT,             -- ''success'' of ''error''\n  p_transcript_id UUID    DEFAULT NULL,\n  p_error_type    TEXT    DEFAULT NULL,\n  p_amount        INTEGER DEFAULT 0,\n  p_reason        TEXT    DEFAULT ''Playlist caption extraction''\n) RETURNS jsonb\nLANGUAGE plpgsql\nSECURITY DEFINER\nAS $$\nDECLARE\n  v_job            playlist_extraction_jobs%ROWTYPE;\n  v_existing       jsonb;\n  v_new_entry      jsonb;\n  v_already_done   boolean := false;\n  v_new_completed  integer;\n  v_new_failed     integer;\n  v_is_complete    boolean;\n  v_has_retryable  boolean;\n  v_new_status     text;\nBEGIN\n  -- Lock de rij voor de duur van de transactie\n  SELECT * INTO v_job\n  FROM playlist_extraction_jobs\n  WHERE id = p_playlist_id\n  FOR UPDATE;\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION ''playlist_extraction_jobs rij niet gevonden: %'', p_playlist_id;\n  END IF;\n\n  -- Idempotentie: controleer of deze video_id al met dezelfde status is geregistreerd\n  v_existing := v_job.video_results -> p_video_id;\n  IF v_existing IS NOT NULL AND (v_existing ->> ''status'') = p_status THEN\n    v_already_done := true;\n  END IF;\n\n  -- Credit-deductie: atomisch met de progress-update, beschermd door v_already_done.\n  IF NOT v_already_done AND p_status = ''success'' AND p_amount > 0 THEN\n    UPDATE user_credits\n    SET credits    = credits - p_amount,\n        updated_at = NOW()\n    WHERE user_id = v_job.user_id;\n\n    INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)\n    VALUES (\n      v_job.user_id,\n      -p_amount,\n      ''debit'',\n      p_reason,\n      jsonb_build_object(''playlist_id'', p_playlist_id, ''video_id'', p_video_id)\n    );\n  END IF;\n\n  -- Bouw de nieuwe JSONB-entry op\n  IF p_status = ''success'' THEN\n    v_new_entry := jsonb_build_object(\n      ''status'',        ''success'',\n      ''transcript_id'', p_transcript_id\n    );\n  ELSE\n    v_new_entry := jsonb_build_object(\n      ''status'',     ''error'',\n      ''error_type'', p_error_type\n    );\n  END IF;\n\n  -- Bereken nieuwe counter-waarden (bij replay: counters ongewijzigd)\n  IF v_already_done THEN\n    v_new_completed := v_job.completed;\n    v_new_failed    := v_job.failed;\n  ELSE\n    IF p_status = ''success'' THEN\n      v_new_completed := v_job.completed + 1;\n      v_new_failed    := v_job.failed;\n    ELSE\n      v_new_completed := v_job.completed;\n      v_new_failed    := v_job.failed + 1;\n    END IF;\n  END IF;\n\n  v_is_complete := (v_new_completed + v_new_failed) >= v_job.total_videos;\n\n  -- Bepaal definitieve status. Bij completion: check op retry-eligible failures.\n  -- ''retry_pending'' \u2192 process_playlist_retries enqueuen (ADR-030 Gap 1 fix).\n  -- ''complete''      \u2192 geen retry nodig, job is definitief klaar.\n  IF v_is_complete THEN\n    v_has_retryable := EXISTS (\n      SELECT 1\n      FROM jsonb_each(v_job.video_results || jsonb_build_object(p_video_id, v_new_entry)) AS kv(key, val)\n      WHERE kv.val ->> ''status'' = ''error''\n        AND kv.val ->> ''error_type'' IN (''bot_detection'', ''timeout'')\n    );\n    v_new_status := CASE WHEN v_has_retryable THEN ''retry_pending'' ELSE ''complete'' END;\n  ELSE\n    v_new_status := v_job.status;  -- geen wijziging\n  END IF;\n\n  -- Atomische update van de playlist-rij\n  UPDATE playlist_extraction_jobs SET\n    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),\n    completed        = v_new_completed,\n    failed           = v_new_failed,\n    last_progress_at = NOW(),\n    status           = v_new_status,\n    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,\n    processing_time_seconds = CASE\n      WHEN v_is_complete\n      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer\n      ELSE processing_time_seconds\n    END\n  WHERE id = p_playlist_id;\n\n  RETURN jsonb_build_object(\n    ''playlist_complete'', v_is_complete,\n    ''should_retry'',      v_is_complete AND v_has_retryable,\n    ''completed'',         v_new_completed,\n    ''failed'',            v_new_failed,\n    ''total'',             v_job.total_videos\n  );\nEND;\n$$;\n\n\n-- \u2500\u2500\u2500 Grants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nGRANT EXECUTE ON FUNCTION update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT)\n  TO authenticated, service_role;\n\n\n-- \u2500\u2500\u2500 Documentatie \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nCOMMENT ON FUNCTION update_playlist_video_progress IS\n  ''Atomic per-video progress update for playlist chain pattern. Zie ADR-025 + ADR-030. ''\n  ''Fase 4: credit-deductie atomisch + idempotent via v_already_done. ''\n  ''Gap 1 fix: status=''''retry_pending'''' wanneer retryable failures bestaan bij completion; ''\n  ''status=''''complete'''' direct wanneer geen retries nodig. ''\n  ''process_playlist_retries zet status naar ''''complete'''' bij voltooiing.'';"]'::jsonb)),
    ARRAY(SELECT jsonb_array_elements_text('[]'::jsonb)),
    'contact@indxr.ai',
    NULL
);

COMMIT;