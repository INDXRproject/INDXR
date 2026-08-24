-- ADR-090 Addendum 3 (truncatiefix): leg de gateway-stopreden + het tokenbudget + de reasoning/
-- zichtbaar-splitsing per call vast, zodat de volgende truncatie-diagnose geen giswerk is. Plus een
-- recovery-marker voor het model-onafhankelijke vangnet. Toegepast via de Supabase MCP op 2026-08-24;
-- dit bestand houdt de repo in sync (idempotent).
alter table public.ai_summary_usage_log
  add column if not exists finish_reason text,
  add column if not exists max_tokens_set integer,
  add column if not exists reasoning_tokens integer,
  add column if not exists recovery text;

comment on column public.ai_summary_usage_log.finish_reason is 'Gateway choices[0].finish_reason (stop/length/…) — why the model stopped.';
comment on column public.ai_summary_usage_log.max_tokens_set is 'The max_tokens we set on the request (the token budget).';
comment on column public.ai_summary_usage_log.reasoning_tokens is 'usage.completion_tokens_details.reasoning_tokens; visible = completion_tokens - reasoning_tokens.';
comment on column public.ai_summary_usage_log.recovery is 'Safety-net marker: null=initial ok, retry, or fallback — set when the content check forced a re-call.';
