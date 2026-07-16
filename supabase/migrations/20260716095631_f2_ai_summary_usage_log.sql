-- F2: per-run token log for AI-summary COR. Insert-only, immutable — one row per DeepSeek call.
-- Fixes attribution: transcripts.ai_summary_usage is UPDATE'd in place on regenerate (only the last run
-- survives, so N runs book 1× COR) and is attributed to transcripts.created_at (transcript birth), not the
-- moment the summary ran. This log is attributed to generated_at and never overwritten.
CREATE TABLE IF NOT EXISTS public.ai_summary_usage_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id     uuid NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at      timestamptz NOT NULL,
  model             text,
  prompt_tokens     integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cache_hit_tokens  integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asul_generated_at ON public.ai_summary_usage_log (generated_at);
CREATE INDEX IF NOT EXISTS idx_asul_user         ON public.ai_summary_usage_log (user_id);

ALTER TABLE public.ai_summary_usage_log ENABLE ROW LEVEL SECURITY;

-- Users may read their own usage; writes are service-role only (backend), reads for COR go via SECURITY DEFINER RPC.
CREATE POLICY "read own summary usage" ON public.ai_summary_usage_log
  FOR SELECT USING (user_id = auth.uid());

-- Backfill the existing summaries (100% carry generated_at) so history matches the go-forward log.
INSERT INTO public.ai_summary_usage_log
  (transcript_id, user_id, generated_at, model, prompt_tokens, completion_tokens, cache_hit_tokens)
SELECT id, user_id,
       (ai_summary_usage->>'generated_at')::timestamptz,
       ai_summary_usage->>'model',
       COALESCE((ai_summary_usage->>'prompt_tokens')::int,0),
       COALESCE((ai_summary_usage->>'completion_tokens')::int,0),
       COALESCE((ai_summary_usage->>'prompt_cache_hit_tokens')::int,0)
FROM public.transcripts
WHERE ai_summary_usage IS NOT NULL
  AND (ai_summary_usage->>'generated_at') IS NOT NULL;
