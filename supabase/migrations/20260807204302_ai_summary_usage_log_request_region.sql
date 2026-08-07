-- ADR-090: per-call logging krijgt request_id (gateway) + region (EU) naast model/generated_at/tokens.
ALTER TABLE public.ai_summary_usage_log
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS region text;
