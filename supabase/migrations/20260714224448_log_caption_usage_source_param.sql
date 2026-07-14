-- B3 — usage_logs.source vullen via log_caption_usage. Additieve DEFAULT-param p_source ('single'|'playlist').
-- Dit is de eigen caption-log-RPC (GEEN gelockte financiële RPC). Oude 6-arg droppen + 7-arg met default,
-- zodat callers zonder p_source ongewijzigd 'single' loggen tot ze bijgewerkt zijn.
DROP FUNCTION IF EXISTS public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean);

CREATE FUNCTION public.log_caption_usage(
  p_user_id      uuid,
  p_video_id     text,
  p_proxy_bytes  bigint,
  p_cache_hit    boolean,
  p_credits_used integer,
  p_success      boolean,
  p_source       text DEFAULT 'single'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
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
    credits_used, proxy_bytes, had_paid_at_time, is_internal_at_time, cache_hit, source
  ) VALUES (
    p_user_id, p_video_id, 'caption', COALESCE(p_success, true),
    GREATEST(COALESCE(p_credits_used,0),0), GREATEST(COALESCE(p_proxy_bytes,0),0),
    v_had_paid, COALESCE(v_is_internal,false), COALESCE(p_cache_hit,false),
    CASE WHEN p_source IN ('single','playlist') THEN p_source ELSE 'single' END
  );
END;
$function$;

COMMENT ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text) IS
  'Schrijf een per-caption event-rij voor een INGELOGDE user (snapshot had_paid + is_internal + source). Anoniem (p_user_id NULL) -> no-op. Service-role only.';

REVOKE ALL ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean,text) TO service_role;
