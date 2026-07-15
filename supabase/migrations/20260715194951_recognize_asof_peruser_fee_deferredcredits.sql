-- _recognize_asof: superset-uitbreiding voor F1 (per-user attributie) + F1b (echte deferred_credits) + F22 (fee-defer).
-- ONGEWIJZIGD: de FIFO/granted-first-consumptie per user (ADR-061). ALLEEN parallelle accumulatoren toegevoegd:
--   - by_user: per (economisch actieve) user {purchased_consumed, consumed_cr, recognized, recognized_fee} → voedt
--     de per-user PERIODE-share in _geld_scope (rec_to − rec_from). Alleen actieve users → map blijft klein bij
--     de grote external-scope populatie.
--   - deferred_credits = Σ lot_rem (echte onverbruikte gekochte credits) i.p.v. terugrekenen uit een blended gemiddelde.
--   - fee per lot (fee_pc = stripe_fee/amount): recognized_fee (op verbruikte gekochte credits) + deferred_fee (rest).
-- Alle bestaande return-keys blijven; nieuwe keys erbij (backward compatible).
CREATE OR REPLACE FUNCTION public._recognize_asof(p_users uuid[], p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  u uuid; ev record;
  granted_bal numeric; lot_rem numeric[]; lot_pc numeric[]; lot_feepc numeric[]; head int; ntot int;
  -- globale totalen
  recognized numeric := 0; purchased_cr numeric := 0; purchased_net numeric := 0; purchased_fee numeric := 0;
  granted_cr numeric := 0; consumed_cr numeric := 0; purch_cons numeric := 0; deferred numeric := 0;
  recognized_fee numeric := 0; deferred_fee numeric := 0; deferred_credits numeric := 0;
  by_user jsonb := '{}'::jsonb;
  -- per-user (reset per user)
  u_recognized numeric; u_purch_cons numeric; u_consumed numeric; u_deferred numeric;
  u_recognized_fee numeric; u_deferred_fee numeric; u_deferred_credits numeric;
  u_purchased_cr numeric; u_purchased_net numeric; u_purchased_fee numeric; u_granted_cr numeric;
  consume numeric; from_granted numeric; take numeric; pc numeric; feepc numeric; net numeric; fee numeric; i int;
BEGIN
  FOREACH u IN ARRAY p_users LOOP
    granted_bal := 0; lot_rem := '{}'; lot_pc := '{}'; lot_feepc := '{}'; head := 1; ntot := 0;
    u_recognized := 0; u_purch_cons := 0; u_consumed := 0; u_deferred := 0;
    u_recognized_fee := 0; u_deferred_fee := 0; u_deferred_credits := 0;
    u_purchased_cr := 0; u_purchased_net := 0; u_purchased_fee := 0; u_granted_cr := 0;
    FOR ev IN
      SELECT ct.type, ct.amount, ct.metadata, (ct.metadata ? 'stripe_session_id') AS is_purchase
      FROM public.credit_transactions ct
      WHERE ct.user_id = u AND ct.created_at < p_to
        AND ( (ct.type='credit' AND ct.metadata ? 'stripe_session_id')
           OR (ct.type='credit' AND NOT COALESCE(ct.metadata ? 'stripe_session_id', false)
                                AND (ct.kind IS NULL OR ct.kind <> 'refund'))
           OR (ct.type='debit' AND ct.product_type IS NOT NULL) )
      ORDER BY ct.created_at ASC, CASE WHEN ct.type='debit' THEN 1 ELSE 0 END, ct.id
    LOOP
      IF ev.type = 'credit' AND ev.is_purchase THEN
        net := COALESCE((ev.metadata->>'settlement_amount')::numeric, (ev.metadata->>'amount_paid')::numeric, 0)
             - COALESCE((public._sale_vat(ev.metadata)->>'vat')::numeric, 0);
        fee := COALESCE((ev.metadata->>'stripe_fee')::numeric, 0);   -- settlement-EUR; ontbreekt → 0 (backfillbaar)
        pc    := CASE WHEN ev.amount > 0 THEN net / ev.amount ELSE 0 END;
        feepc := CASE WHEN ev.amount > 0 THEN fee / ev.amount ELSE 0 END;
        lot_rem := array_append(lot_rem, ev.amount::numeric);
        lot_pc  := array_append(lot_pc, pc);
        lot_feepc := array_append(lot_feepc, feepc);
        ntot := ntot + 1;
        u_purchased_cr := u_purchased_cr + ev.amount; u_purchased_net := u_purchased_net + net; u_purchased_fee := u_purchased_fee + fee;
      ELSIF ev.type = 'credit' THEN
        granted_bal := granted_bal + ev.amount; u_granted_cr := u_granted_cr + ev.amount;
      ELSE
        consume := ev.amount; u_consumed := u_consumed + ev.amount;
        from_granted := LEAST(granted_bal, consume); granted_bal := granted_bal - from_granted; consume := consume - from_granted;
        WHILE consume > 0 AND head <= ntot LOOP
          IF lot_rem[head] <= 0 THEN head := head + 1; CONTINUE; END IF;
          take := LEAST(lot_rem[head], consume);
          u_recognized := u_recognized + take * lot_pc[head];
          u_recognized_fee := u_recognized_fee + take * lot_feepc[head];
          u_purch_cons := u_purch_cons + take;
          lot_rem[head] := lot_rem[head] - take; consume := consume - take;
          IF lot_rem[head] <= 0 THEN head := head + 1; END IF;
        END LOOP;
      END IF;
    END LOOP;
    i := head;
    WHILE i <= ntot LOOP
      IF lot_rem[i] > 0 THEN
        u_deferred := u_deferred + lot_rem[i] * lot_pc[i];
        u_deferred_fee := u_deferred_fee + lot_rem[i] * lot_feepc[i];
        u_deferred_credits := u_deferred_credits + lot_rem[i];
      END IF;
      i := i + 1;
    END LOOP;
    -- globale totalen
    recognized := recognized + u_recognized; purch_cons := purch_cons + u_purch_cons;
    consumed_cr := consumed_cr + u_consumed; deferred := deferred + u_deferred;
    recognized_fee := recognized_fee + u_recognized_fee; deferred_fee := deferred_fee + u_deferred_fee;
    deferred_credits := deferred_credits + u_deferred_credits;
    purchased_cr := purchased_cr + u_purchased_cr; purchased_net := purchased_net + u_purchased_net;
    purchased_fee := purchased_fee + u_purchased_fee; granted_cr := granted_cr + u_granted_cr;
    -- per-user map: alleen economisch actieve users (aankopen of verbruik) → klein bij grote populatie
    IF u_purchased_cr > 0 OR u_consumed > 0 THEN
      by_user := jsonb_set(by_user, ARRAY[u::text], jsonb_build_object(
        'purchased_consumed', u_purch_cons, 'consumed_cr', u_consumed,
        'recognized', u_recognized, 'recognized_fee', u_recognized_fee), true);
    END IF;
  END LOOP;
  RETURN jsonb_build_object(
    'recognized', recognized, 'purchased_consumed', purch_cons, 'deferred', deferred,
    'purchased_cr', purchased_cr, 'purchased_net', purchased_net, 'granted_cr', granted_cr, 'consumed_cr', consumed_cr,
    'recognized_fee', recognized_fee, 'deferred_fee', deferred_fee, 'deferred_credits', deferred_credits,
    'purchased_fee', purchased_fee, 'by_user', by_user);
END;
$function$;
REVOKE ALL ON FUNCTION public._recognize_asof(uuid[], timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._recognize_asof(uuid[], timestamptz) FROM anon, authenticated;
