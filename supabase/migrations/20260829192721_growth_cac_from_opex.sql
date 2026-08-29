-- Toegepast via Supabase MCP apply_migration (version 20260829120000) — dit bestand houdt de repo in sync.
--
-- CAC-reparatie: admin_growth_summary gaf altijd 'cac', NULL terug terwijl de growth-pagina in haar tooltip
-- belooft dat CAC ontgrendelt zodra advertentie-uitgave in opex_expenses staat. Deze migratie maakt die
-- belofte waar.
--
-- Berekening: CAC = advertentie-uitgave (opex_expenses categorie 'ads', geaccrued in het venster p_from..p_to)
--   gedeeld door het aantal NIEUWE betalende klanten in dat venster (v_paying — reeds berekend, ongewijzigd).
-- Numerator via de BESTAANDE public.opex_accrual(date,date) die de finance-tab ook gebruikt (respecteert
-- recurrence/spread/effective-dates) -> CAC's ad-spend is gegarandeerd gelijk aan de finance-OPEX 'ads'-regel
-- voor hetzelfde venster; geen divergentie tussen twee dashboards.
--
-- CAC blijft NULL (pagina toont terecht "—", geen misleidende nul, geen deel-door-nul) wanneer:
--   * het venster lifetime is (p_from OF p_to NULL) — CAC is een venster-metriek; de arg-loze Overview-aanroep
--     toont CAC niet, en opex_accrual is NULL-fragiel op date-grenzen, dus we slaan de call dan over;
--   * er geen advertentie-uitgave in het venster is ingevoerd (v_ad_spend = 0);
--   * er nul betalers zijn (v_paying = 0).
--
-- Alles buiten het 'cac'-veld is byte-voor-byte identiek aan 20260726103508: acquisitie-uitsplitsing per bron,
-- activatie, conversie, retentie en de finance-OPEX-koppeling ongemoeid.

DROP FUNCTION IF EXISTS public.admin_growth_summary(timestamptz, timestamptz);
CREATE FUNCTION public.admin_growth_summary(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  users       uuid[];
  v_total     integer := 0; v_activated integer := 0; v_paying integer := 0; v_repeat integer := 0;
  v_ltv_total numeric := 0;  v_by_source jsonb; v_by_utm jsonb;
  v_ad_spend  numeric := 0;
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

  -- Advertentie-uitgave in het venster (categorie 'ads') via de bestaande finance-accrual. Alleen bij een
  -- bounded venster; lifetime (NULL) laat v_ad_spend op 0 -> CAC NULL.
  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
    SELECT COALESCE((public.opex_accrual(p_from::date, p_to::date) -> 'by_category' ->> 'ads')::numeric, 0)
    INTO v_ad_spend;
  END IF;

  RETURN jsonb_build_object(
    'external_total', v_total,
    'acquisition', jsonb_build_object(
      'by_source', COALESCE(v_by_source,'{}'::jsonb),
      'by_utm', COALESCE(v_by_utm,'{}'::jsonb),
      'cac', CASE WHEN v_ad_spend > 0 AND v_paying > 0 THEN round(v_ad_spend / v_paying, 2) ELSE NULL END),
    'activation', jsonb_build_object(
      'activated', v_activated,
      'rate', CASE WHEN v_total>0 THEN round(v_activated::numeric/v_total,4) ELSE NULL END),
    'monetization', jsonb_build_object(
      'paying', v_paying,
      'conversion', CASE WHEN v_total>0 THEN round(v_paying::numeric/v_total,4) ELSE NULL END,
      'ltv_total', round(v_ltv_total,2),
      'ltv_avg', CASE WHEN v_paying>0 THEN round(v_ltv_total/v_paying,2) ELSE NULL END),
    'retention', jsonb_build_object(
      'repeat_buyers', v_repeat,
      'repeat_rate', CASE WHEN v_paying>0 THEN round(v_repeat::numeric/v_paying,4) ELSE NULL END),
    'window', jsonb_build_object('from', p_from, 'to', p_to)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_growth_summary(timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_summary(timestamptz,timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
