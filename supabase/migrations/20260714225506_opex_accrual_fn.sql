-- DEEL C — periode-accrual: snijd elke entered-kostenreeks door [p_from, p_to) (p_to exclusief, dag-grain).
-- monthly evenly: dagtarief = amount / dagen_in_kalendermaand (→ €300/maand over 1-14 jul = 135,48).
-- none evenly:    dagtarief = amount / dagen_in_occurrence.
-- single:         volledig bedrag op de occurrence-ankerdag.
CREATE OR REPLACE FUNCTION public.opex_accrual(p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
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

    ELSE  -- recurrence 'none': één occurrence
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

REVOKE ALL     ON FUNCTION public.opex_accrual(date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.opex_accrual(date, date) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.opex_accrual(date, date) TO service_role;
