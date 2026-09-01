-- rls_disabled_in_public fix (Supabase security advisor, mail 2026-08-31 / gemeten 2026-09-01):
-- public.summary_cost_baseline_log (ADR-098) is aangemaakt in migratie 20260824140000 ZONDER RLS.
-- Het is een backend-only logtabel: enige schrijver = de SECURITY DEFINER RPC check_summary_cost_baseline
-- (draait als owner → bypast RLS, INSERT blijft werken); enige lezer = de worker via de service-role key
-- (bypast RLS). Geen anon/authenticated-pad raakt de tabel direct. Belt-and-braces, exact het patroon van
-- proxy_usage_log/service_metrics/decodo_daily_usage: RLS aan (dekt rij-toegang) + REVOKE (dekt PostgREST-exposure).
-- Toegepast via de Supabase MCP op 2026-09-01 (version 20260901210140); dit bestand houdt de repo in sync (idempotent).
ALTER TABLE public.summary_cost_baseline_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.summary_cost_baseline_log FROM anon, authenticated;
GRANT ALL ON public.summary_cost_baseline_log TO service_role;
COMMENT ON TABLE public.summary_cost_baseline_log IS
  'ADR-098 rolling-baseline: nachtelijke kost/min-vergelijking recent vs basislijn; breached=true bij ratio>threshold. SERVICE-ROLE-ONLY: RLS aan zonder policies + REVOKE anon/authenticated (belt-and-braces). Enige schrijver = SECURITY DEFINER RPC check_summary_cost_baseline; lezer = worker via service-role key.';
