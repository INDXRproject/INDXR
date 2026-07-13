-- BLOK A (GELD sluit-taak) — per-caption event-rij voor INGELOGDE users.
-- daily_cost_counters blijft uitsluitend voor ANONIEME captions (Blok D).
-- Elke caption door een ingelogde user (standalone én playlist) schrijft één usage_logs-rij
-- met volle-precisie egress + snapshots (had_paid, is_internal, cache_hit) zodat de money-model-
-- segmenten (free-loggedin / paid-after / paid-before, intern/extern, cache-hit) herleidbaar zijn.

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS proxy_bytes         bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS had_paid_at_time    boolean,
  ADD COLUMN IF NOT EXISTS is_internal_at_time boolean,
  ADD COLUMN IF NOT EXISTS cache_hit           boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usage_logs.proxy_bytes IS
  'Decodo egress bytes van deze caption-extractie (volle precisie, 0 bij cache-hit). Alleen ingelogde captions; anoniem → daily_cost_counters.';
COMMENT ON COLUMN public.usage_logs.had_paid_at_time IS
  'Snapshot: had deze user >=1 aankoop op extractie-moment (segment free vs paid-after/paid-before).';
COMMENT ON COLUMN public.usage_logs.is_internal_at_time IS
  'Snapshot: was de user intern/test op extractie-moment (valt buiten echte economie).';
COMMENT ON COLUMN public.usage_logs.cache_hit IS
  'True = Redis/master-cache hit (0 egress). False = cascade-miss (echte proxy-kost).';

-- Index voor de money-RPC-aggregaties (per scope, per credits_used).
CREATE INDEX IF NOT EXISTS usage_logs_caption_cost_idx
  ON public.usage_logs (is_internal_at_time, credits_used)
  WHERE extraction_type = 'caption';

CREATE OR REPLACE FUNCTION public.log_caption_usage(
  p_user_id      uuid,
  p_video_id     text,
  p_proxy_bytes  bigint,
  p_cache_hit    boolean,
  p_credits_used integer,
  p_success      boolean
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
    credits_used, proxy_bytes, had_paid_at_time, is_internal_at_time, cache_hit
  ) VALUES (
    p_user_id, p_video_id, 'caption', COALESCE(p_success, true),
    GREATEST(COALESCE(p_credits_used,0),0), GREATEST(COALESCE(p_proxy_bytes,0),0),
    v_had_paid, COALESCE(v_is_internal,false), COALESCE(p_cache_hit,false)
  );
END;
$function$;

COMMENT ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean) IS
  'Schrijf een per-caption event-rij voor een INGELOGDE user (snapshot had_paid + is_internal). Anoniem (p_user_id NULL) -> no-op (die tellen in daily_cost_counters). Service-role only.';

REVOKE ALL ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_caption_usage(uuid,text,bigint,boolean,integer,boolean) TO service_role;
