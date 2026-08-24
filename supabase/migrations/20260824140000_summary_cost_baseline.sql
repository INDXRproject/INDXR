-- ADR-098: rolling-baseline op de AI-summary kost/minuut. Vergelijkt een recente periode (7d) met de
-- voorgaande langere basislijn (dag 8–37) en slaat aan bij een verdubbeling (ratio > drempel). Onbewaakte
-- bescherming: draait nachtelijk in de worker; de uitkomst wordt hier gelogd zodat het zichtbaar/queryable is.
-- Toegepast via de Supabase MCP op 2026-08-24; dit bestand houdt de repo in sync (idempotent).
create table if not exists public.summary_cost_baseline_log (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  recent_days integer not null,
  prior_days integer not null,
  recent_eur_per_min numeric,
  prior_eur_per_min numeric,
  ratio numeric,
  threshold numeric not null,
  breached boolean not null default false,
  recent_n integer not null,
  prior_n integer not null,
  note text
);
comment on table public.summary_cost_baseline_log is
  'ADR-098 rolling-baseline: nachtelijke kost/min-vergelijking recent vs basislijn; breached=true bij ratio>threshold.';

create or replace function public.check_summary_cost_baseline(
  p_recent_days integer default 7, p_prior_days integer default 30, p_threshold numeric default 2.0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in numeric; v_out numeric; v_sin numeric; v_sout numeric; v_fx numeric;
  v_now timestamptz := now();
  v_recent_start timestamptz := v_now - make_interval(days => p_recent_days);
  v_prior_end timestamptz := v_now - make_interval(days => p_recent_days);
  v_prior_start timestamptz := v_now - make_interval(days => p_recent_days + p_prior_days);
  r_cost numeric; r_min numeric; r_n integer;
  p_cost numeric; p_min numeric; p_n integer;
  v_recent_epm numeric; v_prior_epm numeric; v_ratio numeric;
  v_breached boolean := false; v_note text; result jsonb;
begin
  select assemblyai_llm_usd_per_1m_input_tokens, assemblyai_llm_usd_per_1m_output_tokens,
         assemblyai_llm_sonnet_usd_per_1m_input_tokens, assemblyai_llm_sonnet_usd_per_1m_output_tokens, usd_eur_rate
    into v_in, v_out, v_sin, v_sout, v_fx from cost_config order by effective_from desc limit 1;

  with per_row as (
    select l.transcript_id, l.generated_at, t.duration,
      case when l.model ilike '%sonnet%'
        then (l.prompt_tokens/1e6*v_sin + l.completion_tokens/1e6*v_sout)*v_fx
        else (l.prompt_tokens/1e6*v_in  + l.completion_tokens/1e6*v_out )*v_fx end as cost_eur
    from ai_summary_usage_log l left join transcripts t on t.id = l.transcript_id
    where l.is_test = false
  ),
  per_gen as (
    select transcript_id, generated_at, max(duration) as duration, sum(cost_eur) as cost_eur
    from per_row group by transcript_id, generated_at
  )
  select
    coalesce(sum(cost_eur) filter (where generated_at >= v_recent_start),0),
    coalesce(sum(duration/60.0) filter (where generated_at >= v_recent_start),0),
    count(*) filter (where generated_at >= v_recent_start),
    coalesce(sum(cost_eur) filter (where generated_at >= v_prior_start and generated_at < v_prior_end),0),
    coalesce(sum(duration/60.0) filter (where generated_at >= v_prior_start and generated_at < v_prior_end),0),
    count(*) filter (where generated_at >= v_prior_start and generated_at < v_prior_end)
  into r_cost, r_min, r_n, p_cost, p_min, p_n
  from per_gen;

  v_recent_epm := case when r_min > 0 then r_cost / r_min else null end;
  v_prior_epm  := case when p_min > 0 then p_cost / p_min else null end;

  -- Minimum-sample-guard: geen alarm op één dure video in een stille week.
  if r_n < 3 or p_n < 5 then
    v_note := format('insufficient sample (recent n=%s, prior n=%s) — no flag', r_n, p_n);
  elsif v_recent_epm is not null and v_prior_epm is not null and v_prior_epm > 0 then
    v_ratio := v_recent_epm / v_prior_epm;
    v_breached := v_ratio > p_threshold;
    v_note := case when v_breached then 'BREACH: recent cost/min doubled vs baseline' else 'ok' end;
  else
    v_note := 'no cost/min computable';
  end if;

  insert into public.summary_cost_baseline_log(
    recent_days, prior_days, recent_eur_per_min, prior_eur_per_min, ratio, threshold, breached, recent_n, prior_n, note)
  values (p_recent_days, p_prior_days, round(v_recent_epm,6), round(v_prior_epm,6), round(v_ratio,4),
          p_threshold, v_breached, r_n, p_n, v_note);

  result := jsonb_build_object(
    'recent_eur_per_min', round(v_recent_epm,6), 'prior_eur_per_min', round(v_prior_epm,6),
    'ratio', round(v_ratio,4), 'threshold', p_threshold, 'breached', v_breached,
    'recent_n', r_n, 'prior_n', p_n, 'note', v_note);
  return result;
end;
$$;

grant execute on function public.check_summary_cost_baseline(integer, integer, numeric) to authenticated, service_role;
