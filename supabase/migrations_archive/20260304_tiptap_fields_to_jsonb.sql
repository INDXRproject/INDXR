-- Convert edited_content and ai_summary from TEXT to JSONB.
-- Nullify all existing rows unconditionally — any stored HTML content is invalid JSONB anyway.
UPDATE transcripts SET edited_content = NULL;
UPDATE transcripts SET ai_summary = NULL;

ALTER TABLE transcripts
  ALTER COLUMN edited_content TYPE JSONB USING edited_content::jsonb,
  ALTER COLUMN ai_summary TYPE JSONB USING ai_summary::jsonb;
