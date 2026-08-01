-- When edited_content was last written. Set on every edit-save (now()) and on clear (null).
-- Drives the stale-summary notice: a summary is stale if ai_summary.generated_at is older than
-- this. No backfill: existing edited rows stay null (we don't know when they were edited), which
-- correctly shows no notice.
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS edited_content_updated_at timestamptz;

COMMENT ON COLUMN public.transcripts.edited_content_updated_at IS
  'When edited_content was last written (now() on edit-save, null when cleared/none). Stale-summary notice compares ai_summary.generated_at against this.';
