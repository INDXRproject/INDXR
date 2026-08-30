-- Campaign measurement (ADR-101): extend admin_growth_summary (reproduces the live body verbatim; only
-- ADDS fields, nothing existing changes) with three things the campaign needs:
--   1. acquisition.cost_per_activation — ad spend ÷ FIRST premium actions in the window. Activation =
--      profiles.first_premium_action_at (set once by mark_first_premium_action). Counted on a CALENDAR
--      window (activations that happened in [from,to)), matching the ad-spend window, NOT signup-cohort.
--   2. abuse.welcome_burn_ghost — the raise-to-50 tradeoff made measurable: of accounts ≥7 days old that
--      consumed ≥80% of their welcome grant, the share that never purchased AND never returned (no
--      transcript created >24h after signup). % + numerator + denominator (no denominator = misleading).
--   3. cohorts.activation_to_purchase — per activation-WEEK (date_trunc('week', first_premium_action_at),
--      last 12 wk): of the accounts that activated that week, how many have since purchased. A cohort,
--      not a blended ratio, so a slow-but-healthy pattern isn't hidden and a fast-but-dead one isn't flattered.
CREATE OR REPLACE FUNCTION public.admin_growth_summary(
  p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  users       uuid[];
  v_total     integer := 0; v_activated integer := 0; v_paying integer := 0; v_repeat integer := 0;
  v_ltv_total numeric := 0;  v_by_source jsonb; v_by_utm jsonb;
  v_ad_spend  numeric := 0;
  v_first_activated integer := 0;   -- accounts whose FIRST premium action fell in the window
  v_burned    integer := 0;         -- accounts that consumed ~all of their welcome grant
  v_ghost     integer := 0;         -- ... of which never purchased AND never returned
  v_cohorts   jsonb;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles
  WHERE NOT is_internal
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to   IS NULL OR created_at <  p_to);
  v_total := COALESCE(array_length(users, 1), 0);

  SELECT jsonb_object_agg(src, c) INTO v_by_source FROM (
    SELECT COALESCE(signup_source,'direct') AS src, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) a;
  SELECT jsonb_object_agg(u, c) INTO v_by_utm FROM (
    SELECT COALESCE(utm_source,'none') AS u, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) b;

  SELECT count(DISTINCT ct.user_id) INTO v_activated
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users);

  SELECT count(DISTINCT user_id), COALESCE(sum(paid),0) INTO v_paying, v_ltv_total FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.user_id, COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at) p;

  SELECT count(*) INTO v_repeat FROM (
    SELECT ct.user_id
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    GROUP BY ct.user_id
    HAVING count(DISTINCT ct.metadata->>'stripe_session_id') >= 2) r;

  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
    SELECT COALESCE((public.opex_accrual(p_from::date, p_to::date) -> 'by_category' ->> 'ads')::numeric, 0)
    INTO v_ad_spend;
  END IF;

  -- (1) Activations in the window: accounts whose first premium action happened in [from,to). Calendar
  --     window (matches ad spend), not the signup-cohort `users` array.
  SELECT count(*) INTO v_first_activated
  FROM public.profiles
  WHERE NOT is_internal AND first_premium_action_at IS NOT NULL
    AND (p_from IS NULL OR first_premium_action_at >= p_from)
    AND (p_to   IS NULL OR first_premium_action_at <  p_to);

  -- (2) Welcome-credit burn-and-ghost (accounts old enough to have had a chance to return).
  WITH cohort AS (
    SELECT p.id, p.created_at,
      COALESCE((SELECT sum(ct.amount) FROM public.credit_transactions ct
                WHERE ct.user_id=p.id AND ct.kind='grant' AND ct.reason ILIKE '%welcome%'),0) AS grant_amt,
      COALESCE((SELECT sum(ct.amount) FROM public.credit_transactions ct
                WHERE ct.user_id=p.id AND ct.type='debit'),0) AS consumed,
      EXISTS(SELECT 1 FROM public.credit_transactions ct
             WHERE ct.user_id=p.id AND ct.type='credit' AND ct.metadata ? 'stripe_session_id') AS purchased,
      EXISTS(SELECT 1 FROM public.transcripts t
             WHERE t.user_id=p.id AND t.created_at > p.created_at + interval '24 hours') AS returned
    FROM public.profiles p
    WHERE NOT p.is_internal AND p.created_at < now() - interval '7 days'
  ), burned AS (
    SELECT * FROM cohort WHERE grant_amt > 0 AND consumed >= 0.8 * grant_amt
  )
  SELECT count(*), count(*) FILTER (WHERE NOT purchased AND NOT returned)
  INTO v_burned, v_ghost FROM burned;

  -- (3) Activation-to-purchase by activation week (last 12 weeks). "Purchased" = ever, to now.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'week', wk, 'activated', activated, 'purchased', purchased,
           'rate', CASE WHEN activated>0 THEN round(purchased::numeric/activated,4) ELSE NULL END
         ) ORDER BY wk), '[]'::jsonb)
  INTO v_cohorts
  FROM (
    SELECT to_char(date_trunc('week', p.first_premium_action_at), 'YYYY-MM-DD') AS wk,
           count(*) AS activated,
           count(*) FILTER (WHERE EXISTS(
             SELECT 1 FROM public.credit_transactions ct
             WHERE ct.user_id=p.id AND ct.type='credit' AND ct.metadata ? 'stripe_session_id')) AS purchased
    FROM public.profiles p
    WHERE NOT p.is_internal AND p.first_premium_action_at IS NOT NULL
      AND p.first_premium_action_at >= date_trunc('week', now()) - interval '11 weeks'
    GROUP BY 1
  ) c;

  RETURN jsonb_build_object(
    'external_total', v_total,
    'acquisition', jsonb_build_object(
      'by_source', COALESCE(v_by_source,'{}'::jsonb),
      'by_utm', COALESCE(v_by_utm,'{}'::jsonb),
      'cac', CASE WHEN v_ad_spend > 0 AND v_paying > 0 THEN round(v_ad_spend / v_paying, 2) ELSE NULL END,
      'cost_per_activation', CASE WHEN v_ad_spend > 0 AND v_first_activated > 0
                                  THEN round(v_ad_spend / v_first_activated, 2) ELSE NULL END),
    'activation', jsonb_build_object(
      'activated', v_activated,
      'rate', CASE WHEN v_total>0 THEN round(v_activated::numeric/v_total,4) ELSE NULL END,
      'first_activated', v_first_activated),
    'monetization', jsonb_build_object(
      'paying', v_paying,
      'conversion', CASE WHEN v_total>0 THEN round(v_paying::numeric/v_total,4) ELSE NULL END,
      'ltv_total', round(v_ltv_total,2),
      'ltv_avg', CASE WHEN v_paying>0 THEN round(v_ltv_total/v_paying,2) ELSE NULL END),
    'retention', jsonb_build_object(
      'repeat_buyers', v_repeat,
      'repeat_rate', CASE WHEN v_paying>0 THEN round(v_repeat::numeric/v_paying,4) ELSE NULL END),
    'abuse', jsonb_build_object(
      'welcome_burn_ghost', jsonb_build_object(
        'ghosted', v_ghost, 'burned', v_burned,
        'rate', CASE WHEN v_burned>0 THEN round(v_ghost::numeric/v_burned,4) ELSE NULL END)),
    'cohorts', jsonb_build_object('activation_to_purchase', v_cohorts),
    'window', jsonb_build_object('from', p_from, 'to', p_to)
  );
END;
$function$;
