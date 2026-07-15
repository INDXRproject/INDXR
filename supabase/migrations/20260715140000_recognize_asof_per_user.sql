-- FIX (financieel kritiek): _recognize_asof pooldde granted-first OVER users heen (één gedeeld granted_bal +
-- één FIFO-lot-array voor de samengevoegde event-stream). Granted-first is PER-PORTEMONNEE-logica: de gratis
-- credits van user A mogen nooit het verbruik van user B compenseren. Maak de recognitie per-user: elke user
-- zijn eigen event-stream + eigen granted_bal + eigen FIFO purchase-lots; sommeer pas daarna over de scope.
-- Dit voedt ook purchased_share (COR-splitsing against_revenue vs goodwill) → die was even vergiftigd.
CREATE OR REPLACE FUNCTION public._recognize_asof(p_users uuid[], p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  u             uuid;
  ev            record;
  granted_bal   numeric;
  lot_rem       numeric[];
  lot_pc        numeric[];
  head          int;
  ntot          int;
  -- scope-totalen (som over users)
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
  FOREACH u IN ARRAY p_users LOOP
    -- reset per-user portemonnee-staat
    granted_bal := 0; lot_rem := '{}'; lot_pc := '{}'; head := 1; ntot := 0;
    FOR ev IN
      SELECT ct.type, ct.amount, ct.metadata,
             (ct.metadata ? 'stripe_session_id') AS is_purchase
      FROM public.credit_transactions ct
      WHERE ct.user_id = u AND ct.created_at < p_to
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
      ELSE  -- debit = consumptie: granted-first (van DEZE user), dan diens FIFO purchase-lots
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
        -- consume>0 = verbruik boven eigen beschikbare potten (mag niet) → genegeerd
      END IF;
    END LOOP;

    -- resterende (onverbruikte) aankoop-lots van DEZE user = deferred
    i := head;
    WHILE i <= ntot LOOP
      IF lot_rem[i] > 0 THEN deferred := deferred + lot_rem[i] * lot_pc[i]; END IF;
      i := i + 1;
    END LOOP;
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
