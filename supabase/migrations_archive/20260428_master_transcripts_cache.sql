-- master_transcripts: cross-user persistent transcript cache.
-- Metadata in Supabase; JSON content stored in Cloudflare R2 (r2_key pointer).
-- Service-role only — no user-facing policies, RLS enabled to block anon/JWT access.
-- See ADR-021 and ADR-020.

CREATE TABLE master_transcripts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id                 TEXT NOT NULL,
  language                 TEXT NOT NULL,
  transcription_model      TEXT NOT NULL,
  r2_key                   TEXT NOT NULL,
  source_method            TEXT NOT NULL DEFAULT 'caption_extraction',
  model_quality_rank       INTEGER,
  quality_score            FLOAT,
  duration_seconds         INTEGER,
  character_count          INTEGER,
  word_count               INTEGER,
  fetched_from_provider_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, language, transcription_model)
);

CREATE INDEX idx_master_transcripts_lookup
  ON master_transcripts (video_id, language, transcription_model)
  WHERE deprecated_at IS NULL;

ALTER TABLE master_transcripts ENABLE ROW LEVEL SECURITY;
-- No policies intentionally: only SUPABASE_SERVICE_ROLE_KEY (Python backend) has access.
