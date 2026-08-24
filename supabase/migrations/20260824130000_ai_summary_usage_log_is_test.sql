-- ADR-098: markeer meetverkeer (summary_health.py --generate) als test, zodat de gateway-kost meetelt
-- in de totaal-COR maar uit de per-user-marge en het Operations-paneel gefilterd wordt. Health-runs
-- zijn echte AssemblyAI-uitgaven die nergens landden; nu wél geboekt, maar niet vervuilend.
-- Toegepast via de Supabase MCP op 2026-08-24; dit bestand houdt de repo in sync (idempotent).
alter table public.ai_summary_usage_log
  add column if not exists is_test boolean not null default false;

comment on column public.ai_summary_usage_log.is_test is
  'True = meetverkeer (summary_health.py), telt in totaal-COR maar niet in per-user-marge of Operations-paneel.';

-- De paneel-/marge-queries filteren standaard op productie-verkeer (is_test=false); partiële index daarop.
create index if not exists ai_summary_usage_log_prod_idx
  on public.ai_summary_usage_log (generated_at) where is_test = false;
