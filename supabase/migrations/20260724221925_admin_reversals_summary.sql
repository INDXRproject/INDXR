-- Toegepast via Supabase MCP apply_migration (version 20260724221925) — dit bestand houdt de repo in sync.
--
-- Reversals-samenvatting voor de Finance-tab (chargeback/refund-regel). Leest payment_reversals.
-- Bewust een APARTE RPC (niet admin_finance_summary aanpassen) zodat de getal-voor-getal geauditeerde
-- P&L-engine ongemoeid blijft. Scope-split external/internal via de user achter de reversal:
-- user_id direct, of -- als die leeg is -- via stripe_payment_intent_id -> credit_transactions -> user.
-- Onbekende user => external (echte economie, zoals anonieme egress). occurred_at bepaalt de periode.
--
-- money_out = geld dat DEFINITIEF weg is: refunds + verloren disputes (amount) + alle dispute-fees.
-- Openstaande disputes zijn "at risk" -> apart getoond, niet in money_out (uitkomst nog onbekend).

CREATE OR REPLACE FUNCTION public.admin_reversals_summary(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH scoped AS (
    SELECT
      r.kind,
      r.status,
      COALESCE(r.amount, 0) AS amount,
      COALESCE(r.fee, 0)    AS fee,
      COALESCE(p.is_internal, false) AS is_internal
    FROM public.payment_reversals r
    LEFT JOIN public.profiles p
      ON p.id = COALESCE(
           r.user_id,
           (SELECT ct.user_id FROM public.credit_transactions ct
             WHERE ct.metadata->>'payment_intent_id' = r.stripe_payment_intent_id
               AND ct.user_id IS NOT NULL
             LIMIT 1)
         )
    WHERE r.occurred_at >= p_from AND r.occurred_at < p_to
  )
  SELECT jsonb_build_object(
    'external', (
      SELECT jsonb_build_object(
        'refund', jsonb_build_object(
          'count',  count(*) FILTER (WHERE kind='refund'),
          'amount', COALESCE(sum(amount) FILTER (WHERE kind='refund'), 0)),
        'dispute', jsonb_build_object(
          'count',       count(*) FILTER (WHERE kind='dispute'),
          'amount',      COALESCE(sum(amount) FILTER (WHERE kind='dispute'), 0),
          'fee',         COALESCE(sum(fee)    FILTER (WHERE kind='dispute'), 0),
          'open_count',  count(*) FILTER (WHERE kind='dispute' AND COALESCE(status,'') NOT IN ('won','lost')),
          'open_amount', COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND COALESCE(status,'') NOT IN ('won','lost')), 0),
          'won_count',   count(*) FILTER (WHERE kind='dispute' AND status='won'),
          'lost_count',  count(*) FILTER (WHERE kind='dispute' AND status='lost'),
          'lost_amount', COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND status='lost'), 0)),
        'money_out',
          COALESCE(sum(amount) FILTER (WHERE kind='refund'), 0)
          + COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND status='lost'), 0)
          + COALESCE(sum(fee)    FILTER (WHERE kind='dispute'), 0)
      ) FROM scoped WHERE is_internal = false),
    'internal', (
      SELECT jsonb_build_object(
        'refund', jsonb_build_object(
          'count',  count(*) FILTER (WHERE kind='refund'),
          'amount', COALESCE(sum(amount) FILTER (WHERE kind='refund'), 0)),
        'dispute', jsonb_build_object(
          'count',       count(*) FILTER (WHERE kind='dispute'),
          'amount',      COALESCE(sum(amount) FILTER (WHERE kind='dispute'), 0),
          'fee',         COALESCE(sum(fee)    FILTER (WHERE kind='dispute'), 0),
          'open_count',  count(*) FILTER (WHERE kind='dispute' AND COALESCE(status,'') NOT IN ('won','lost')),
          'open_amount', COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND COALESCE(status,'') NOT IN ('won','lost')), 0),
          'won_count',   count(*) FILTER (WHERE kind='dispute' AND status='won'),
          'lost_count',  count(*) FILTER (WHERE kind='dispute' AND status='lost'),
          'lost_amount', COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND status='lost'), 0)),
        'money_out',
          COALESCE(sum(amount) FILTER (WHERE kind='refund'), 0)
          + COALESCE(sum(amount) FILTER (WHERE kind='dispute' AND status='lost'), 0)
          + COALESCE(sum(fee)    FILTER (WHERE kind='dispute'), 0)
      ) FROM scoped WHERE is_internal = true)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reversals_summary(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reversals_summary(timestamptz, timestamptz) TO service_role;
