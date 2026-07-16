-- F3: snapshot_finance_day (a) reads storage COR from _geld_scope (per-user attributed) instead of computing
-- it flat locally, (b) drops the now-duplicate storage term from net (v_cor_rev from _geld_scope already
-- includes per-user storage; v_good includes storage goodwill), (c) writes the per-user library_bytes series
-- (daily_library_bytes) each night so future look-backs can read the period-stand instead of stand-now.
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

  -- F3: persist the per-user library_bytes series (external users) for this day — the measurement that lets
  -- future period look-backs read the standing library instead of prorating today's bytes over history.
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
    v_cor_sto := (rec#>>'{cor,storage}')::numeric;         -- F3: from _geld_scope (per-user)
    v_cor_rev := (rec->>'cor_against_revenue')::numeric;   -- includes usage-share + recognized_fee + storage
    v_stor_b  := (rec->>'storage_bytes')::numeric;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric; -- includes storage goodwill
    v_sold    := (rec->>'purchased_cr')::numeric;
    v_cons    := (rec->>'consumed_cr')::numeric;
    v_deferred:= (rec->>'deferred_revenue')::numeric;

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
      v_fun_an := 0; v_radar_fee := 0;
    END IF;

    -- Net (measured) per ADR-063 — identical to admin_finance_summary net minus the live entered-OPEX overlay.
    -- cor_against_revenue (from _geld_scope) already includes per-user storage; goodwill includes storage goodwill.
    v_net := v_revdel
             - v_cor_rev
             - (v_good + v_fun_ll + v_fun_an + v_radar_fee);

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