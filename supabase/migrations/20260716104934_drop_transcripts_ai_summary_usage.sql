-- Cleanup (ADR-065): remove transcripts.ai_summary_usage. Since ADR-064 the COR-bron is ai_summary_usage_log
-- (insert-only, on generated_at); the live _geld_scope reads only the log, no view/trigger/function reads the
-- column (verified), and the UI never read it. Two sources for one number where one drives nothing is a trap.
-- History lives in the log (the 2 rows were backfilled). Lost telemetry: deepseek_created (peak-pricing ts,
-- unused — generated_at is a within-seconds proxy) and prompt_cache_miss_tokens (derivable: prompt − cache_hit).
ALTER TABLE public.transcripts DROP COLUMN IF EXISTS ai_summary_usage;
