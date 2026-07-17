-- Point 4 consistency: the nightly snapshot's external proxy-overhead must also exclude internal/test egress.
-- Point 5: a catch-up wrapper so a missed night can't become a permanent Trend gap (snapshot is idempotent).
CREATE OR REPLACE FUNCTION public.snapshot_finance_day(p_day date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  d          date;
  from_utc   timestamptz;
  to_utc     timestamptz;
  cfg        public.cost_config%ROWTYPE;
  v_scope    text;
  v_internal boolean;
  rec        jsonb;
  v_cash     numeric; v_vat numeric; v_revdel numeric;
  v_cor_ai   numeric; v_cor_cap numeric; v_cor_sum numeric; v_cor_rag numeric; v_cor_sto numeric;
  v_cor_rev  numeric;
  v_fun_ll   numeric; v_fun_an numeric; v_good numeric; v_fee numeric;
  v_radar_fee numeric; v_scr_sb integer; v_scr_fb integer;
  v_proxy_fail numeric; v_proxy_global numeric; v_proxy_oh numeric;
  v_sold     numeric; v_cons numeric; v_deferred numeric;
  v_gr_to    numeric; v_cons_to numeric; v_outfree numeric;
  v_stor_b   numeric;
  v_net      numeric;
  out        jsonb := '[]'::jsonb;
BEGIN
  d        := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1);
  from_utc := d::timestamp            AT TIME ZONE 'Europe/Amsterdam';
  to_utc   := (d + 1)::timestamp      AT TIME ZONE 'Europe/Amsterdam';

  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  INSERT INTO public.daily_library_bytes (day, user_id, library_bytes)
  SELECT d, uc.user_id, COALESCE(uc.library_bytes,0)
  FROM public.user_credits uc JOIN public.profiles p ON p.id = uc.user_id
  WHERE NOT p.is_internal
  ON CONFLICT (day, user_id) DO UPDATE SET library_bytes = EXCLUDED.library_bytes, created_at = now();

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
    v_cor_sto := (rec#>>'{cor,storage}')::numeric;
    v_cor_rev := (rec->>'cor_against_revenue')::numeric;
    v_stor_b  := (rec->>'storage_bytes')::numeric;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric;
    v_sold    := (rec->>'purchased_cr')::numeric;
    v_cons    := (rec->>'consumed_cr')::numeric;
    v_deferred:= (rec->>'deferred_revenue')::numeric;
    v_proxy_fail := COALESCE((rec->>'proxy_fail_bytes')::numeric, 0);

    SELECT COALESCE(sum(fee),0) INTO v_fee FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
             COALESCE((ct.metadata->>'stripe_fee')::numeric,0) AS fee
      FROM public.credit_transactions ct
      JOIN public.profiles p ON p.id = ct.user_id AND p.is_internal = v_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id'
        AND ct.created_at >= from_utc AND ct.created_at < to_utc
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s;

    SELECT COALESCE(sum(ct.amount),0) INTO v_gr_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
      AND (ct.kind IS NULL OR ct.kind<>'refund') AND ct.created_at < to_utc;
    SELECT COALESCE(sum(ct.amount),0) INTO v_cons_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.created_at < to_utc;
    v_outfree := GREATEST(0, v_gr_to - v_cons_to);

    IF v_internal = false THEN
      SELECT COALESCE(sum(caption_proxy_bytes),0) INTO v_fun_an
      FROM public.daily_cost_counters WHERE day = d;
      v_fun_an := (v_fun_an/1e9) * cfg.decodo_eur_per_gb;

      SELECT COALESCE(sum(bytes),0) INTO v_proxy_global
      FROM public.proxy_usage_log WHERE occurred_at >= from_utc AND occurred_at < to_utc AND NOT is_internal;

      SELECT count(DISTINCT ct.metadata->>'stripe_session_id') FILTER (WHERE ct.created_at >= cfg.radar_free_until::timestamptz)
        INTO v_scr_sb
      FROM public.credit_transactions ct
      JOIN public.profiles pr ON pr.id = ct.user_id AND NOT pr.is_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= from_utc AND ct.created_at < to_utc;
      SELECT count(*) FILTER (WHERE screened AND occurred_at >= cfg.radar_free_until::timestamptz)
        INTO v_scr_fb
      FROM public.payment_attempts pa
      LEFT JOIN public.profiles pr ON pr.id = pa.user_id
      WHERE NOT COALESCE(pr.is_internal, false) AND pa.occurred_at >= from_utc AND pa.occurred_at < to_utc;
      v_radar_fee := (COALESCE(v_scr_sb,0) + COALESCE(v_scr_fb,0)) * COALESCE(cfg.radar_eur_per_screen,0);
    ELSE
      v_fun_an := 0; v_radar_fee := 0; v_proxy_global := 0;
    END IF;

    v_proxy_oh := ((v_proxy_fail + COALESCE(v_proxy_global,0))/1e9) * cfg.decodo_eur_per_gb;

    v_net := v_revdel
             - v_cor_rev
             - (v_good + v_fun_ll + v_fun_an + v_radar_fee + v_proxy_oh);

    INSERT INTO public.finance_daily_snapshot AS f (
      snapshot_date, scope, cash_in, vat, revenue_delivered, stripe_fee,
      cor_ai_transcription, cor_caption, cor_ai_summary, cor_rag, cor_storage,
      opex_funnel_loggedin, opex_funnel_anon, opex_goodwill, opex_proxy_overhead, net_profit_measured,
      credits_sold, credits_consumed, deferred_balance, outstanding_free_credits, storage_bytes)
    VALUES (
      d, v_scope, v_cash, v_vat, v_revdel, v_fee,
      v_cor_ai, v_cor_cap, v_cor_sum, v_cor_rag, v_cor_sto,
      v_fun_ll, v_fun_an, v_good, round(v_proxy_oh,6), v_net,
      v_sold, v_cons, v_deferred, v_outfree, v_stor_b)
    ON CONFLICT (snapshot_date, scope) DO UPDATE SET
      cash_in=EXCLUDED.cash_in, vat=EXCLUDED.vat, revenue_delivered=EXCLUDED.revenue_delivered,
      stripe_fee=EXCLUDED.stripe_fee, cor_ai_transcription=EXCLUDED.cor_ai_transcription,
      cor_caption=EXCLUDED.cor_caption, cor_ai_summary=EXCLUDED.cor_ai_summary, cor_rag=EXCLUDED.cor_rag,
      cor_storage=EXCLUDED.cor_storage, opex_funnel_loggedin=EXCLUDED.opex_funnel_loggedin,
      opex_funnel_anon=EXCLUDED.opex_funnel_anon, opex_goodwill=EXCLUDED.opex_goodwill,
      opex_proxy_overhead=EXCLUDED.opex_proxy_overhead,
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

-- Catch-up: fill any day between the series start (clean-start anchor) and yesterday that has < 2 scope rows,
-- most-recent first, at most p_max per run. Idempotent (snapshot_finance_day upserts) so re-runs are free. N=7:
-- one run stays well under a second even filling a week; a >7-day outage is a major incident that warrants a
-- manual look rather than a silent multi-week catch-up that could overlap the next nightly. Never touches days
-- before the existing series (respects the deliberate clean start at 2026-07-16, ADR-064) — only forward gaps.
CREATE OR REPLACE FUNCTION public.snapshot_finance_catchup(p_max integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_yesterday date := (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1;
  v_floor date;
  v_done date[] := ARRAY[]::date[];
  v_d date;
BEGIN
  SELECT min(snapshot_date) INTO v_floor FROM public.finance_daily_snapshot;
  IF v_floor IS NULL THEN
    PERFORM public.snapshot_finance_day(v_yesterday);
    RETURN jsonb_build_object('filled', ARRAY[v_yesterday]::date[], 'note', 'empty series → wrote yesterday');
  END IF;
  FOR v_d IN
    SELECT g::date FROM generate_series(v_floor, v_yesterday, interval '1 day') g
    WHERE (SELECT count(*) FROM public.finance_daily_snapshot f WHERE f.snapshot_date = g::date) < 2
    ORDER BY g DESC
    LIMIT GREATEST(1, p_max)
  LOOP
    PERFORM public.snapshot_finance_day(v_d);
    v_done := v_done || v_d;
  END LOOP;
  RETURN jsonb_build_object('filled', v_done, 'count', COALESCE(array_length(v_done,1),0),
                            'floor', v_floor, 'through', v_yesterday);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.snapshot_finance_catchup(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_finance_catchup(integer) TO service_role;

-- Repoint the nightly pg_cron from the single-day snapshot to the catch-up wrapper (same 02:00 UTC schedule).
SELECT cron.schedule('finance-daily-snapshot', '0 2 * * *', 'SELECT public.snapshot_finance_catchup(7);');
