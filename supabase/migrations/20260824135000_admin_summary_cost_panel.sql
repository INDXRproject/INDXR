-- ADR-098: Operations "Summary cost" paneel-bron. Rekent per SAMENVATTING (= één (transcript_id,
-- generated_at)-generatie) de gateway-COR in euro, per duurklasse median/p99/max, de marge op het
-- GOEDKOOPSTE pakket (Power €0,02/credit = worst-case), het vangnet-aandeel (retry/fallback) en de
-- finish_reason/model-verdeling. Alleen productie-verkeer (is_test=false). SECURITY DEFINER: het
-- paneel draait admin-side; RLS op de log mag hier niet in de weg zitten.
-- Toegepast via de Supabase MCP op 2026-08-24; dit bestand houdt de repo in sync (idempotent).
create or replace function public.admin_summary_cost_panel(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in numeric; v_out numeric; v_sin numeric; v_sout numeric; v_fx numeric;
  v_cheapest_eur_per_credit numeric := 0.02;  -- Power €60/3000cr = goedkoopste = worst-case marge
  v_from timestamptz := now() - make_interval(days => p_days);
  result jsonb;
begin
  select assemblyai_llm_usd_per_1m_input_tokens, assemblyai_llm_usd_per_1m_output_tokens,
         assemblyai_llm_sonnet_usd_per_1m_input_tokens, assemblyai_llm_sonnet_usd_per_1m_output_tokens,
         usd_eur_rate
    into v_in, v_out, v_sin, v_sout, v_fx
  from cost_config order by effective_from desc limit 1;

  with per_row as (
    select l.transcript_id, l.generated_at, t.duration,
      case when l.model ilike '%sonnet%'
        then (l.prompt_tokens/1e6*v_sin + l.completion_tokens/1e6*v_sout)*v_fx
        else (l.prompt_tokens/1e6*v_in  + l.completion_tokens/1e6*v_out )*v_fx end as cost_eur
    from ai_summary_usage_log l
    left join transcripts t on t.id = l.transcript_id
    where l.is_test = false and l.generated_at >= v_from
  ),
  per_gen as (
    select transcript_id, generated_at, max(duration) as duration, sum(cost_eur) as cost_eur
    from per_row group by transcript_id, generated_at
  ),
  classed as (
    select cost_eur, duration,
      case when duration is null then 'unknown'
           when duration <= 1800 then '≤30 min'
           when duration <= 5400 then '30–90 min'
           else '>90 min' end as dclass,
      (3 + greatest(0, ceil((coalesce(duration,0)-1800)/1200.0))) as credits,
      (3 + greatest(0, ceil((coalesce(duration,0)-1800)/1200.0))) * v_cheapest_eur_per_credit as revenue_eur
    from per_gen
  ),
  by_class as (
    select dclass,
      count(*) as n,
      percentile_cont(0.5) within group (order by cost_eur) as median_eur,
      percentile_cont(0.99) within group (order by cost_eur) as p99_eur,
      max(cost_eur) as max_eur,
      percentile_cont(0.5) within group (order by revenue_eur - cost_eur) as margin_median_eur,
      min(revenue_eur - cost_eur) as margin_worst_eur
    from classed group by dclass
  ),
  cls_json as (
    select jsonb_agg(jsonb_build_object(
      'dclass', dclass, 'n', n,
      'median_eur', round(median_eur::numeric,4), 'p99_eur', round(p99_eur::numeric,4),
      'max_eur', round(max_eur::numeric,4),
      'margin_median_eur', round(margin_median_eur::numeric,4),
      'margin_worst_eur', round(margin_worst_eur::numeric,4)
    ) order by case dclass when '≤30 min' then 1 when '30–90 min' then 2 when '>90 min' then 3 else 4 end) as j
    from by_class
  ),
  net as (
    select count(*) filter (where recovery is not null) as any_recovery,
           count(*) filter (where recovery = 'retry') as retry_calls,
           count(*) filter (where recovery = 'fallback') as fallback_calls,
           count(*) as total_calls
    from ai_summary_usage_log
    where is_test = false and generated_at >= v_from
  ),
  fin as (
    select jsonb_object_agg(coalesce(finish_reason,'null'), c) as j from (
      select finish_reason, count(*) c from ai_summary_usage_log
      where is_test = false and generated_at >= v_from group by finish_reason) s
  ),
  mdl as (
    select jsonb_object_agg(coalesce(model,'null'), c) as j from (
      select model, count(*) c from ai_summary_usage_log
      where is_test = false and generated_at >= v_from group by model) s
  ),
  brk as (
    select count(*) as breaker_fires from transcription_jobs
    where error_type = 'SummaryCostBreaker' and created_at >= v_from
  )
  select jsonb_build_object(
    'days', p_days,
    'cheapest_eur_per_credit', v_cheapest_eur_per_credit,
    'by_class', coalesce((select j from cls_json), '[]'::jsonb),
    'safety_net', jsonb_build_object(
      'total_calls', (select total_calls from net),
      'retry_calls', (select retry_calls from net),
      'fallback_calls', (select fallback_calls from net),
      'retry_share', case when (select total_calls from net) > 0
                          then round(((select retry_calls from net)::numeric/(select total_calls from net)),4) else 0 end,
      'fallback_share', case when (select total_calls from net) > 0
                          then round(((select fallback_calls from net)::numeric/(select total_calls from net)),4) else 0 end,
      'breaker_fires', (select breaker_fires from brk)
    ),
    'finish_reason', coalesce((select j from fin), '{}'::jsonb),
    'model', coalesce((select j from mdl), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_summary_cost_panel(integer) to authenticated, service_role;

-- ADR-098: per-account AI-summary COR ("dezelfde query", per user_id). Maakt zichtbaar wanneer één
-- account structureel meer kost dan het oplevert. Opbrengst benaderd op het goedkoopste pakket (worst-case).
create or replace function public.admin_summary_cost_per_user(p_days integer default 90, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in numeric; v_out numeric; v_sin numeric; v_sout numeric; v_fx numeric;
  v_from timestamptz := now() - make_interval(days => p_days);
  result jsonb;
begin
  select assemblyai_llm_usd_per_1m_input_tokens, assemblyai_llm_usd_per_1m_output_tokens,
         assemblyai_llm_sonnet_usd_per_1m_input_tokens, assemblyai_llm_sonnet_usd_per_1m_output_tokens, usd_eur_rate
    into v_in, v_out, v_sin, v_sout, v_fx from cost_config order by effective_from desc limit 1;

  with per_row as (
    select l.user_id, l.transcript_id, l.generated_at, t.duration,
      case when l.model ilike '%sonnet%'
        then (l.prompt_tokens/1e6*v_sin + l.completion_tokens/1e6*v_sout)*v_fx
        else (l.prompt_tokens/1e6*v_in  + l.completion_tokens/1e6*v_out )*v_fx end as cost_eur
    from ai_summary_usage_log l left join transcripts t on t.id = l.transcript_id
    where l.is_test = false and l.generated_at >= v_from
  ),
  per_gen as (
    select user_id, transcript_id, generated_at, max(duration) as duration, sum(cost_eur) as cost_eur
    from per_row group by user_id, transcript_id, generated_at
  ),
  per_user as (
    select user_id, count(*) as n_summaries, sum(cost_eur) as cost_eur,
           sum((3 + greatest(0, ceil((coalesce(duration,0)-1800)/1200.0))) * 0.02) as revenue_worst_eur
    from per_gen group by user_id
  )
  select jsonb_agg(jsonb_build_object(
      'user_id', pu.user_id, 'email', pr.email, 'n_summaries', pu.n_summaries,
      'cost_eur', round(pu.cost_eur::numeric,4),
      'revenue_worst_eur', round(pu.revenue_worst_eur::numeric,4),
      'margin_worst_eur', round((pu.revenue_worst_eur - pu.cost_eur)::numeric,4)
    ) order by pu.cost_eur desc)
  into result
  from (select * from per_user order by cost_eur desc limit p_limit) pu
  left join auth.users pr on pr.id = pu.user_id;

  return coalesce(result, '[]'::jsonb);
end;
$$;

grant execute on function public.admin_summary_cost_per_user(integer, integer) to authenticated, service_role;
