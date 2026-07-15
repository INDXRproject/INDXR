-- FIX (financieel kritiek): granted-first recognitie was CUMULATIEF (LEAST(purchased, max(0, consumed−granted)))
-- → een grant NA aankoop+verbruik verlaagde met terugwerkende kracht de al erkende omzet (clawback zonder
-- refund). Vervangen door CHRONOLOGISCHE pooling: simuleer de event-stream op volgorde, granted-first, met
-- FIFO purchase-lots. Elke consumptie trekt uit wat op DAT moment beschikbaar was; een latere grant/aankoop
-- raakt het verleden (en bevroren snapshots) niet meer. recognized + deferred = purchased_net (invariant).

CREATE OR REPLACE FUNCTION public._recognize_asof(p_users uuid[], p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  ev            record;
  granted_bal   numeric := 0;
  lot_rem       numeric[] := '{}';   -- FIFO purchase-lots: resterende credits
  lot_pc        numeric[] := '{}';   -- €/credit van elk lot (eigen net/credits)
  head          int := 1;            -- FIFO-kop
  ntot          int := 0;
  recognized    numeric := 0;
  purchased_cr  numeric := 0;
  purchased_net numeric := 0;
  granted_cr    numeric := 0;
  consumed_cr   numeric := 0;
  purch_cons    numeric := 0;
  deferred      numeric := 0;
  consume       numeric;
  from_granted  numeric;
  take          numeric;
  pc            numeric;
  net           numeric;
  i             int;
BEGIN
  FOR ev IN
    SELECT ct.type, ct.amount, ct.metadata,
           (ct.metadata ? 'stripe_session_id') AS is_purchase
    FROM public.credit_transactions ct
    WHERE ct.user_id = ANY(p_users) AND ct.created_at < p_to
      AND ( (ct.type='credit' AND ct.metadata ? 'stripe_session_id')
         OR (ct.type='credit' AND NOT COALESCE(ct.metadata ? 'stripe_session_id', false)
                              AND (ct.kind IS NULL OR ct.kind <> 'refund'))
         OR (ct.type='debit' AND ct.product_type IS NOT NULL) )
    ORDER BY ct.created_at ASC, CASE WHEN ct.type='debit' THEN 1 ELSE 0 END, ct.id
  LOOP
    IF ev.type = 'credit' AND ev.is_purchase THEN
      net := COALESCE((ev.metadata->>'amount_paid')::numeric,0) - COALESCE((ev.metadata->>'amount_tax')::numeric,0);
      pc  := CASE WHEN ev.amount > 0 THEN net / ev.amount ELSE 0 END;
      lot_rem := array_append(lot_rem, ev.amount::numeric);
      lot_pc  := array_append(lot_pc, pc);
      ntot := ntot + 1;
      purchased_cr  := purchased_cr + ev.amount;
      purchased_net := purchased_net + net;
    ELSIF ev.type = 'credit' THEN
      granted_bal := granted_bal + ev.amount;
      granted_cr  := granted_cr + ev.amount;
    ELSE  -- debit = consumptie: granted-first, dan FIFO purchase-lots
      consume := ev.amount;
      consumed_cr := consumed_cr + ev.amount;
      from_granted := LEAST(granted_bal, consume);
      granted_bal := granted_bal - from_granted;
      consume := consume - from_granted;
      WHILE consume > 0 AND head <= ntot LOOP
        IF lot_rem[head] <= 0 THEN head := head + 1; CONTINUE; END IF;
        take := LEAST(lot_rem[head], consume);
        recognized := recognized + take * lot_pc[head];
        purch_cons := purch_cons + take;
        lot_rem[head] := lot_rem[head] - take;
        consume := consume - take;
        IF lot_rem[head] <= 0 THEN head := head + 1; END IF;
      END LOOP;
      -- consume>0 hier = verbruik boven beschikbare potten (mag niet voorkomen bij correcte balans) → genegeerd
    END IF;
  END LOOP;

  i := head;
  WHILE i <= ntot LOOP
    IF lot_rem[i] > 0 THEN deferred := deferred + lot_rem[i] * lot_pc[i]; END IF;
    i := i + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'recognized', recognized,
    'purchased_consumed', purch_cons,
    'deferred', deferred,
    'purchased_cr', purchased_cr,
    'purchased_net', purchased_net,
    'granted_cr', granted_cr,
    'consumed_cr', consumed_cr);
END;
$function$;

REVOKE ALL     ON FUNCTION public._recognize_asof(uuid[], timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._recognize_asof(uuid[], timestamptz) FROM anon, authenticated;

-- _geld_scope: recognitie-blok vervangen door chronologische _recognize_asof (rest ongewijzigd).
CREATE OR REPLACE FUNCTION public._geld_scope(
  p_internal boolean,
  p_from timestamptz DEFAULT '-infinity',
  p_to   timestamptz DEFAULT 'infinity'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg               public.cost_config%ROWTYPE;
  users             uuid[];
  v_purchased_cr    numeric := 0;
  v_gross           numeric := 0;
  v_vat             numeric := 0;
  v_vat_known       boolean := false;
  v_granted_cr      numeric := 0;
  v_consumed_cr     numeric := 0;
  v_cons_ai         numeric := 0;
  v_cons_cap        numeric := 0;
  v_cons_sum        numeric := 0;
  v_cons_rag        numeric := 0;
  v_balance_cr      numeric := 0;
  rec_to            jsonb;
  rec_from          jsonb;
  v_recognized      numeric := 0;
  v_deferred        numeric := 0;
  v_cons_purch_to   numeric := 0;
  v_consumed_to     numeric := 0;
  v_per_credit_net  numeric := 0;
  v_dur_sec         numeric := 0;
  v_proxy_bytes     numeric := 0;
  v_prompt_tok      numeric := 0;
  v_compl_tok       numeric := 0;
  v_cache_tok       numeric := 0;
  v_cor_ai          numeric := 0;
  v_cor_cap         numeric := 0;
  v_cor_sum         numeric := 0;
  v_cor_rag         numeric := 0;
  v_cor_total       numeric := 0;
  v_purchased_share numeric := 0;
  v_cor_rev         numeric := 0;
  v_granted_deliv   numeric := 0;
  v_gross_profit    numeric := 0;
  v_cap_paid_bytes  numeric := 0;
  v_cap_free_bytes  numeric := 0;
  v_funnel_free_cap numeric := 0;
  v_seg_free_ll     jsonb;
  v_seg_paid_after  jsonb;
  v_seg_paid_cap    jsonb;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles WHERE is_internal = p_internal;

  -- Period purchases (FLOW): reported cash_in/vat/purchased_cr/vat_known.
  SELECT COALESCE(sum(amount),0), COALESCE(sum(paid),0), COALESCE(sum(tax),0), COALESCE(bool_or(has_tax),false)
    INTO v_purchased_cr, v_gross, v_vat, v_vat_known
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount,
      COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0)  AS tax,
      (ct.metadata ? 'amount_tax')                       AS has_tax
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at >= p_from AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  -- Period granted (FLOW).
  SELECT COALESCE(sum(amount),0) INTO v_granted_cr
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  -- Period consumed by type (FLOW).
  SELECT COALESCE(sum(amount),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_transcription'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='caption'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_summary'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='rag'),0)
    INTO v_consumed_cr, v_cons_ai, v_cons_cap, v_cons_sum, v_cons_rag
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  SELECT COALESCE(sum(credits),0) INTO v_balance_cr
  FROM public.user_credits WHERE user_id = ANY(users);

  -- COR (period flow).
  SELECT COALESCE(sum(duration_seconds),0), COALESCE(sum(proxy_bytes),0)
    INTO v_dur_sec, v_proxy_bytes
  FROM public.transcription_jobs
  WHERE status='complete' AND cache_hit = false AND user_id = ANY(users)
    AND created_at >= p_from AND created_at < p_to;
  v_cor_ai := (v_dur_sec/60.0)*cfg.assemblyai_eur_per_min + (v_proxy_bytes/1e9)*cfg.decodo_eur_per_gb;

  SELECT COALESCE(sum((ai_summary_usage->>'prompt_tokens')::numeric),0),
         COALESCE(sum((ai_summary_usage->>'completion_tokens')::numeric),0),
         COALESCE(sum(COALESCE((ai_summary_usage->>'prompt_cache_hit_tokens')::numeric,0)),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.transcripts
  WHERE ai_summary_usage IS NOT NULL AND user_id = ANY(users)
    AND created_at >= p_from AND created_at < p_to;
  v_cor_sum := (GREATEST(v_prompt_tok - v_cache_tok,0)/1000.0)*cfg.deepseek_eur_per_1k_input_tokens
             + (v_cache_tok/1000.0)*cfg.deepseek_eur_per_1k_cache_hit_tokens
             + (v_compl_tok/1000.0)*cfg.deepseek_eur_per_1k_output_tokens;

  SELECT COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used > 0), 0),
         COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used = 0), 0)
    INTO v_cap_paid_bytes, v_cap_free_bytes
  FROM public.usage_logs
  WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal
    AND created_at >= p_from AND created_at < p_to;
  v_cor_cap         := (v_cap_paid_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_funnel_free_cap := (v_cap_free_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_cor_rag   := 0;
  v_cor_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag;

  -- CHRONOLOGISCHE recognitie (fix clawback). recognized = periode-flow = cum_to − cum_from.
  rec_to   := public._recognize_asof(users, p_to);
  rec_from := public._recognize_asof(users, p_from);
  v_recognized     := (rec_to->>'recognized')::numeric - (rec_from->>'recognized')::numeric;
  v_deferred       := (rec_to->>'deferred')::numeric;                          -- stock as-of to
  v_cons_purch_to  := (rec_to->>'purchased_consumed')::numeric;                -- stock as-of to
  v_consumed_to    := (rec_to->>'consumed_cr')::numeric;
  v_per_credit_net := CASE WHEN (rec_to->>'purchased_cr')::numeric > 0
                        THEN (rec_to->>'purchased_net')::numeric / (rec_to->>'purchased_cr')::numeric ELSE 0 END;

  -- COR-splitsing op chronologische purchased-share.
  v_purchased_share := CASE WHEN v_consumed_to > 0 THEN v_cons_purch_to / v_consumed_to ELSE 0 END;
  v_cor_rev       := v_cor_total * v_purchased_share;
  v_granted_deliv := v_cor_total * (1 - v_purchased_share);
  v_gross_profit  := v_recognized - v_cor_rev;

  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_free_ll FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=false
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_paid_after FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=true
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_paid_cap FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used>0
     AND created_at >= p_from AND created_at < p_to;

  RETURN jsonb_build_object(
    'cash_in_gross', round(v_gross,2),
    'vat', round(v_vat,2),
    'vat_known', v_vat_known,
    'revenue_net', round(v_gross - v_vat,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit_net,4),
    'consumed_purchased_cr', v_cons_purch_to,
    'recognized_revenue', round(v_recognized,2),
    'deferred_revenue', round(v_deferred,2),
    'consumed_by_type', jsonb_build_object(
      'ai_transcription', v_cons_ai, 'caption', v_cons_cap, 'ai_summary', v_cons_sum, 'rag', v_cons_rag),
    'cor', jsonb_build_object(
      'ai_transcription', round(v_cor_ai,4),
      'caption', round(v_cor_cap,4),
      'ai_summary', round(v_cor_sum,4),
      'rag', round(v_cor_rag,4),
      'total', round(v_cor_total,4)),
    'cor_caption_estimated', false,
    'cor_against_revenue', round(v_cor_rev,4),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'funnel_free_caption_cost', round(v_funnel_free_cap,4),
    'caption_segments', jsonb_build_object(
      'free_loggedin', v_seg_free_ll,
      'paid_after',    v_seg_paid_after,
      'paid_caption',  v_seg_paid_cap),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END,
    'purchased_share', round(v_purchased_share,6)
  );
END;
$function$;

REVOKE ALL     ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM anon, authenticated;
