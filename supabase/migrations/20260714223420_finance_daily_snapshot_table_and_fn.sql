-- B1 — onherstelbare dagelijkse snapshot. Bevriest ALLEEN measured (revenue/COR/measured-OPEX/stocks);
-- entered-OPEX (infra/ads) wordt NIET bevroren (live overlay, ontwerpkeuze). Alles numeric, nergens afgerond
-- op centen-niveau. PK (snapshot_date, scope) → idempotent via ON CONFLICT.

CREATE TABLE IF NOT EXISTS public.finance_daily_snapshot (
  snapshot_date          date    NOT NULL,
  scope                  text    NOT NULL CHECK (scope IN ('external','internal')),
  -- FLOWS (€, optelbaar over dagen)
  cash_in                numeric NOT NULL DEFAULT 0,
  vat                    numeric NOT NULL DEFAULT 0,
  revenue_delivered      numeric NOT NULL DEFAULT 0,
  stripe_fee             numeric NOT NULL DEFAULT 0,
  cor_ai_transcription   numeric NOT NULL DEFAULT 0,
  cor_caption            numeric NOT NULL DEFAULT 0,
  cor_ai_summary         numeric NOT NULL DEFAULT 0,
  cor_rag                numeric NOT NULL DEFAULT 0,
  cor_storage            numeric NOT NULL DEFAULT 0,
  opex_funnel_loggedin   numeric NOT NULL DEFAULT 0,
  opex_funnel_anon       numeric NOT NULL DEFAULT 0,
  opex_goodwill          numeric NOT NULL DEFAULT 0,
  net_profit_measured    numeric NOT NULL DEFAULT 0,
  -- FLOWS (credits, optelbaar)
  credits_sold           numeric NOT NULL DEFAULT 0,
  credits_consumed       numeric NOT NULL DEFAULT 0,
  -- STOCKS (laatste stand telt, as-of einde dag / snapshot-moment)
  deferred_balance       numeric NOT NULL DEFAULT 0,
  outstanding_free_credits numeric NOT NULL DEFAULT 0,
  storage_bytes          numeric NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, scope)
);
COMMENT ON TABLE public.finance_daily_snapshot IS
  'Onherstelbare nachtelijke money-snapshot per dag×scope. Bevroren MEASURED-cijfers voor optelbare trends. Entered-OPEX bewust NIET bevroren (live overlay). Dag = Europe/Amsterdam-kalenderdag.';

ALTER TABLE public.finance_daily_snapshot ENABLE ROW LEVEL SECURITY;
-- Geen policies → alleen service_role (bypass) en SECURITY DEFINER-functies lezen/schrijven.

CREATE OR REPLACE FUNCTION public.snapshot_finance_day(p_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  d          date;
  from_utc   timestamptz;
  to_utc     timestamptz;
  days_in_m  numeric;
  cfg        public.cost_config%ROWTYPE;
  v_scope    text;
  v_internal boolean;
  rec        jsonb;
  v_cash     numeric; v_vat numeric; v_revdel numeric;
  v_cor_ai   numeric; v_cor_cap numeric; v_cor_sum numeric; v_cor_rag numeric; v_cor_sto numeric;
  v_fun_ll   numeric; v_fun_an numeric; v_good numeric; v_fee numeric;
  v_sold     numeric; v_cons numeric; v_deferred numeric;
  v_gr_to    numeric; v_cons_to numeric; v_outfree numeric;
  v_stor_b   numeric; v_stor_gb numeric;
  v_net      numeric;
  out        jsonb := '[]'::jsonb;
BEGIN
  -- DST-aware "gisteren Amsterdam" (of expliciete p_day). Lokale middernacht → UTC-instant per datum.
  d        := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1);
  from_utc := d::timestamp            AT TIME ZONE 'Europe/Amsterdam';
  to_utc   := (d + 1)::timestamp      AT TIME ZONE 'Europe/Amsterdam';
  days_in_m := EXTRACT(DAY FROM (date_trunc('month', d::timestamp) + interval '1 month - 1 day'));

  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  FOR v_scope, v_internal IN
    SELECT s, i FROM (VALUES ('external', false), ('internal', true)) AS t(s, i)
  LOOP
    rec := public._geld_scope(v_internal, from_utc, to_utc);

    v_cash    := (rec->>'cash_in_gross')::numeric;
    v_vat     := (rec->>'vat')::numeric;
    v_revdel  := (rec->>'recognized_revenue')::numeric;
    v_cor_ai  := (rec#>>'{cor,ai_transcription}')::numeric;
    v_cor_cap := (rec#>>'{cor,caption}')::numeric;
    v_cor_sum := (rec#>>'{cor,ai_summary}')::numeric;
    v_cor_rag := (rec#>>'{cor,rag}')::numeric;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric;
    v_sold    := (rec->>'purchased_cr')::numeric;
    v_cons    := (rec->>'consumed_cr')::numeric;
    v_deferred:= (rec->>'deferred_revenue')::numeric;

    -- stripe_fee (FLOW): som per DISTINCT session in venster, deze scope. (Nu 0 tot B4-wiring live is.)
    SELECT COALESCE(sum(fee),0) INTO v_fee FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
             COALESCE((ct.metadata->>'stripe_fee')::numeric,0) AS fee
      FROM public.credit_transactions ct
      JOIN public.profiles p ON p.id = ct.user_id AND p.is_internal = v_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id'
        AND ct.created_at >= from_utc AND ct.created_at < to_utc
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s;

    -- outstanding_free_credits (STOCK): cumulatief granted - consumed (granted-first), as-of to.
    SELECT COALESCE(sum(ct.amount),0) INTO v_gr_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
      AND (ct.kind IS NULL OR ct.kind<>'refund') AND ct.created_at < to_utc;
    SELECT COALESCE(sum(ct.amount),0) INTO v_cons_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.created_at < to_utc;
    v_outfree := GREATEST(0, v_gr_to - v_cons_to);

    -- Globale posten (anon-funnel + storage) horen één keer thuis → alleen op de external-rij.
    IF v_internal = false THEN
      SELECT COALESCE(sum(caption_proxy_bytes),0) INTO v_fun_an
      FROM public.daily_cost_counters WHERE day = d;
      v_fun_an := (v_fun_an/1e9) * cfg.decodo_eur_per_gb;

      SELECT COALESCE(sum(uc.library_bytes),0) INTO v_stor_b
      FROM public.user_credits uc JOIN public.profiles p ON p.id=uc.user_id WHERE NOT p.is_internal;
      v_stor_gb := v_stor_b / 1e9;
      v_cor_sto := GREATEST(0, v_stor_gb - COALESCE(cfg.r2_free_gb,0))
                   * COALESCE(cfg.r2_usd_per_gb_month,0) * COALESCE(cfg.usd_eur_rate,1) / days_in_m;
    ELSE
      v_fun_an := 0; v_stor_b := 0; v_cor_sto := 0;
    END IF;

    v_net := v_revdel
             - (v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag + v_cor_sto)
             - (v_fun_ll + v_fun_an + v_good + v_fee);

    INSERT INTO public.finance_daily_snapshot AS f (
      snapshot_date, scope, cash_in, vat, revenue_delivered, stripe_fee,
      cor_ai_transcription, cor_caption, cor_ai_summary, cor_rag, cor_storage,
      opex_funnel_loggedin, opex_funnel_anon, opex_goodwill, net_profit_measured,
      credits_sold, credits_consumed, deferred_balance, outstanding_free_credits, storage_bytes)
    VALUES (
      d, v_scope, v_cash, v_vat, v_revdel, v_fee,
      v_cor_ai, v_cor_cap, v_cor_sum, v_cor_rag, v_cor_sto,
      v_fun_ll, v_fun_an, v_good, v_net,
      v_sold, v_cons, v_deferred, v_outfree, v_stor_b)
    ON CONFLICT (snapshot_date, scope) DO UPDATE SET
      cash_in=EXCLUDED.cash_in, vat=EXCLUDED.vat, revenue_delivered=EXCLUDED.revenue_delivered,
      stripe_fee=EXCLUDED.stripe_fee, cor_ai_transcription=EXCLUDED.cor_ai_transcription,
      cor_caption=EXCLUDED.cor_caption, cor_ai_summary=EXCLUDED.cor_ai_summary, cor_rag=EXCLUDED.cor_rag,
      cor_storage=EXCLUDED.cor_storage, opex_funnel_loggedin=EXCLUDED.opex_funnel_loggedin,
      opex_funnel_anon=EXCLUDED.opex_funnel_anon, opex_goodwill=EXCLUDED.opex_goodwill,
      net_profit_measured=EXCLUDED.net_profit_measured, credits_sold=EXCLUDED.credits_sold,
      credits_consumed=EXCLUDED.credits_consumed, deferred_balance=EXCLUDED.deferred_balance,
      outstanding_free_credits=EXCLUDED.outstanding_free_credits, storage_bytes=EXCLUDED.storage_bytes,
      created_at=now();

    out := out || jsonb_build_object('scope', v_scope, 'net_profit_measured', round(v_net,4),
                   'revenue_delivered', round(v_revdel,4), 'cash_in', round(v_cash,2));
  END LOOP;

  RETURN jsonb_build_object('snapshot_date', d, 'from_utc', from_utc, 'to_utc', to_utc, 'rows', out);
END;
$function$;

REVOKE ALL     ON FUNCTION public.snapshot_finance_day(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_finance_day(date) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.snapshot_finance_day(date) TO service_role;
