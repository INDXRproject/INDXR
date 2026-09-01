-- Belt-and-braces: 10 backend-only tabellen hebben policyloze RLS (bedoeld beleid = service-role-only,
-- GEEN policy verzinnen) maar droegen nog default anon/authenticated CRUD-grants. RLS zonder policy weigert
-- reads al, maar de grants zijn residuele exposure. Alle toegang is service_role (createAdminClient / Stripe-webhook
-- / Python-backend — geverifieerd: 0 browser/anon-client-reads). Zelfde eindstaat als proxy_usage_log/service_metrics/
-- decodo_daily_usage/summary_cost_baseline_log. service_role behoudt zijn grant (+ BYPASSRLS).
-- Toegepast via Supabase MCP op 2026-09-02 (version 20260901221251); dit bestand houdt de repo in sync.
REVOKE ALL ON public.cost_config            FROM anon, authenticated;
REVOKE ALL ON public.daily_cost_counters    FROM anon, authenticated;
REVOKE ALL ON public.finance_daily_snapshot FROM anon, authenticated;
REVOKE ALL ON public.finance_settings       FROM anon, authenticated;
REVOKE ALL ON public.idempotency_keys       FROM anon, authenticated;
REVOKE ALL ON public.master_transcripts     FROM anon, authenticated;
REVOKE ALL ON public.opex_expenses          FROM anon, authenticated;
REVOKE ALL ON public.ops_config             FROM anon, authenticated;
REVOKE ALL ON public.payment_attempts       FROM anon, authenticated;
REVOKE ALL ON public.payment_reversals      FROM anon, authenticated;

COMMENT ON TABLE public.master_transcripts IS 'Transcript-cache (ADR-021). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants; alleen de Python-backend (service_role) leest/schrijft.';
COMMENT ON TABLE public.idempotency_keys   IS 'Idempotency-sleutels (Stripe/webhook). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants.';
COMMENT ON TABLE public.payment_attempts   IS 'Stripe payment-attempt log (Radar/geo). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants; alleen de webhook (service_role).';
COMMENT ON TABLE public.payment_reversals  IS 'Refunds/chargebacks (Stripe). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants; alleen de webhook (service_role).';
COMMENT ON TABLE public.ops_config         IS 'Operations runtime-config. SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants.';
