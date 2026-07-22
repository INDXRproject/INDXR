-- ADR-071 DEEL 1: caption-extractie latency-instrumentatie.
-- Voeg een server-side gemeten latency-kolom toe aan usage_logs (cache-hit én miss) en breid de
-- log_caption_usage-RPC uit met p_duration_ms. Geen PII (privacy-by-design). Backend-only:
-- service_role-executeert; anon/authenticated blijven zonder EXECUTE (LESSONS 2026-07-13).

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS duration_ms integer;

COMMENT ON COLUMN public.usage_logs.duration_ms IS
  'ADR-071: server-side gemeten caption-extractie-latency in ms (cache-hit en miss). Geen PII.';

-- Nieuwe parameter → nieuwe signatuur; oude 7-arg-versie eerst droppen.
DROP FUNCTION IF EXISTS public.log_caption_usage(uuid, text, bigint, boolean, integer, boolean, text);

CREATE OR REPLACE FUNCTION public.log_caption_usage(
  p_user_id uuid,
  p_video_id text,
  p_proxy_bytes bigint,
  p_cache_hit boolean,
  p_credits_used integer,
  p_success boolean,
  p_source text DEFAULT 'single'::text,
  p_duration_ms integer DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_had_paid    boolean;
  v_is_internal boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;  -- anonieme captions horen niet in usage_logs (tellen in daily_cost_counters).
  END IF;

  v_had_paid := EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND type = 'credit' AND metadata ? 'stripe_session_id'
  );
  SELECT COALESCE(is_internal, false) INTO v_is_internal
    FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.usage_logs (
    user_id, video_id, extraction_type, success,
    credits_used, proxy_bytes, had_paid_at_time, is_internal_at_time, cache_hit, source, duration_ms
  ) VALUES (
    p_user_id, p_video_id, 'caption', COALESCE(p_success, true),
    GREATEST(COALESCE(p_credits_used,0),0), GREATEST(COALESCE(p_proxy_bytes,0),0),
    v_had_paid, COALESCE(v_is_internal,false), COALESCE(p_cache_hit,false),
    CASE WHEN p_source IN ('single','playlist') THEN p_source ELSE 'single' END,
    CASE WHEN p_duration_ms IS NULL THEN NULL ELSE GREATEST(p_duration_ms,0) END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text,integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text,integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text,integer) TO service_role;
