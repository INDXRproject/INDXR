-- Entered-OPEX model dekkend maken (ADR-065): add recurrence='yearly' (anniversary-based) to opex_accrual,
-- so a yearly prepayment (domeinverlenging) is ONE entry that auto-repeats each year — parallel aan 'monthly'
-- (niet 1 rij per jaar handmatig). spread='evenly' smeert de vooruitbetaling uit over de 12-maands looptijd
-- (matching — de kost hoort bij de periode waarin je het domein gebruikt); spread='single' boekt op de betaaldag.
-- Bestaande 'none'/'monthly'-takken ongewijzigd. Geen COR/revenue-formule geraakt.
ALTER TABLE public.opex_expenses DROP CONSTRAINT IF EXISTS opex_expenses_recurrence_check;
ALTER TABLE public.opex_expenses ADD CONSTRAINT opex_expenses_recurrence_check
  CHECK (recurrence = ANY (ARRAY['none'::text, 'monthly'::text, 'yearly'::text]));

CREATE OR REPLACE FUNCTION public.opex_accrual(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  e          record;
  m          date;
  occ_start  date;
  occ_end    date;      -- inclusief
  denom      numeric;
  daily      numeric;
  ov         numeric;   -- overlap-dagen met [p_from,p_to)
  anchor     date;
  line_amt   numeric;
  line_days  numeric;
  line_denom numeric;
  total      numeric := 0;
  bycat      jsonb := '{}'::jsonb;
  lines      jsonb := '[]'::jsonb;
BEGIN
  FOR e IN SELECT * FROM public.opex_expenses LOOP
    line_amt := 0; line_days := 0; line_denom := 0;

    IF e.recurrence = 'monthly' THEN
      m := date_trunc('month', GREATEST(e.effective_from, p_from))::date;
      WHILE m < p_to AND (e.effective_to IS NULL OR m <= e.effective_to) LOOP
        occ_start := GREATEST(m, e.effective_from);
        occ_end   := LEAST((m + interval '1 month - 1 day')::date,
                           COALESCE(e.effective_to, (m + interval '1 month - 1 day')::date));
        IF e.spread = 'evenly' THEN
          denom := EXTRACT(DAY FROM (m + interval '1 month - 1 day'))::numeric;  -- dagen in kalendermaand
          daily := e.amount / denom;
          ov := GREATEST(0, LEAST(occ_end + 1, p_to) - GREATEST(occ_start, p_from));
          IF ov > 0 THEN
            line_amt := line_amt + ov * daily;
            line_days := line_days + ov;
            line_denom := line_denom + denom;
          END IF;
        ELSE  -- single: bedrag op ankerdag (occurrence-start)
          anchor := occ_start;
          IF anchor >= p_from AND anchor < p_to THEN
            line_amt := line_amt + e.amount;
            line_days := line_days + 1;
            line_denom := line_denom + 1;
          END IF;
        END IF;
        m := (m + interval '1 month')::date;
      END LOOP;

    ELSIF e.recurrence = 'yearly' THEN
      -- Occurrences anchored on the anniversary of effective_from, stepping +1 year. Elke occurrence is een
      -- 12-maands looptijd [anniversary, anniversary+1jr). evenly = dagelijks uitgesmeerd over die looptijd
      -- (365/366 dagen); single = volledig bedrag op de verjaardag (betaaldag).
      anchor := e.effective_from;
      WHILE (anchor + interval '1 year')::date <= p_from LOOP
        anchor := (anchor + interval '1 year')::date;
      END LOOP;
      WHILE anchor < p_to AND (e.effective_to IS NULL OR anchor <= e.effective_to) LOOP
        occ_start := GREATEST(anchor, e.effective_from);
        occ_end   := LEAST((anchor + interval '1 year - 1 day')::date,
                           COALESCE(e.effective_to, (anchor + interval '1 year - 1 day')::date));
        IF e.spread = 'evenly' THEN
          denom := ((anchor + interval '1 year')::date - anchor)::numeric;   -- looptijd-dagen (365/366)
          daily := e.amount / denom;
          ov := GREATEST(0, LEAST(occ_end + 1, p_to) - GREATEST(occ_start, p_from));
          IF ov > 0 THEN
            line_amt := line_amt + ov * daily;
            line_days := line_days + ov;
            line_denom := line_denom + denom;
          END IF;
        ELSE  -- single: volledig bedrag op de verjaardag/betaaldag
          IF anchor >= p_from AND anchor < p_to THEN
            line_amt := line_amt + e.amount;
            line_days := line_days + 1;
            line_denom := line_denom + 1;
          END IF;
        END IF;
        anchor := (anchor + interval '1 year')::date;
      END LOOP;

    ELSE  -- recurrence 'none': één occurrence (eenmalig of custom periode X..Y)
      occ_start := e.effective_from;
      occ_end   := COALESCE(e.effective_to, e.effective_from);
      IF e.spread = 'evenly' THEN
        denom := (occ_end - occ_start + 1)::numeric;   -- dagen in occurrence
        daily := e.amount / denom;
        ov := GREATEST(0, LEAST(occ_end + 1, p_to) - GREATEST(occ_start, p_from));
        IF ov > 0 THEN
          line_amt := ov * daily; line_days := ov; line_denom := denom;
        END IF;
      ELSE  -- single
        anchor := occ_start;
        IF anchor >= p_from AND anchor < p_to THEN
          line_amt := e.amount; line_days := 1; line_denom := 1;
        END IF;
      END IF;
    END IF;

    IF line_amt <> 0 THEN
      total := total + line_amt;
      bycat := jsonb_set(bycat, ARRAY[e.category],
                 to_jsonb(COALESCE((bycat->>e.category)::numeric,0) + line_amt), true);
      lines := lines || jsonb_build_object(
        'id', e.id, 'category', e.category,
        'description', COALESCE(e.description, e.note),
        'recurrence', e.recurrence, 'spread', e.spread,
        'effective_from', e.effective_from, 'effective_to', e.effective_to,
        'amount', e.amount,
        'period_amount', round(line_amt,2),
        'days_applied', line_days, 'days_total', line_denom);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('total', round(total,2), 'by_category', bycat, 'lines', lines);
END;
$function$;