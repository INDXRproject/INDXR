-- Operations-leespaneel: per-hoofdstuk-doorlooptijd van AI-samenvattingen (ADR-096-meetlaag).
-- Leest ai_summary_usage_log.chapter_ms (per-hoofdstuk-tijd, alleen op stap-2-sectiecalls). Testverkeer
-- (is_test) telt niet mee, net als de bestaande kostenpanelen. Geen drempels/alarmen — puur lezen.
-- Beantwoordt: (1) hoe lang een hoofdstuk normaal/traagst duurt (percentielen); (2) welk aandeel van de
-- totale samenvattings-tijd naar het traagste hoofdstuk gaat; (3) kruising = op welke POSITIE het
-- traagste hoofdstuk zit (histogram van de traagste chapter_index).

create or replace function public.admin_chapter_duration_panel(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with chap as (
    -- Eén rij per hoofdstuk (een hoofdstuk kan meerdere call-rijen hebben bij retry/fallback; chapter_ms
    -- is per rij gelijk). Dedup zodat percentielen niet dubbeltellen.
    select distinct on (transcript_id, generated_at, chapter_index)
           transcript_id, generated_at, chapter_index, chapter_ms
    from public.ai_summary_usage_log
    where is_test = false
      and chapter_ms is not null
      and generated_at >= now() - make_interval(days => p_days)
  ),
  overall as (
    select count(*) as n,
           round((percentile_cont(0.50) within group (order by chapter_ms))::numeric, 0) as p50,
           round((percentile_cont(0.90) within group (order by chapter_ms))::numeric, 0) as p90,
           round((percentile_cont(0.95) within group (order by chapter_ms))::numeric, 0) as p95,
           round((percentile_cont(0.99) within group (order by chapter_ms))::numeric, 0) as p99,
           max(chapter_ms) as max
    from chap
  ),
  per_summary as (
    select transcript_id, generated_at,
           max(chapter_ms) as slowest_ms,
           sum(chapter_ms) as total_ms,
           (array_agg(chapter_index order by chapter_ms desc, chapter_index))[1] as slowest_index,
           count(*) as n_chapters
    from chap
    group by transcript_id, generated_at
    having sum(chapter_ms) > 0 and count(*) > 1
  ),
  share as (
    select count(*) as n,
           round((percentile_cont(0.50) within group (order by slowest_ms::numeric / total_ms)) * 100, 0) as share_p50_pct,
           round((percentile_cont(0.90) within group (order by slowest_ms::numeric / total_ms)) * 100, 0) as share_p90_pct
    from per_summary
  ),
  pos as (
    select slowest_index, count(*) as n
    from per_summary
    group by slowest_index
  )
  select jsonb_build_object(
    'days', p_days,
    'overall', (select to_jsonb(overall) from overall),
    'slowest_share', (select to_jsonb(share) from share),
    'slowest_position', (select coalesce(jsonb_agg(to_jsonb(pos) order by slowest_index), '[]'::jsonb) from pos),
    'generated_at', now()
  );
$fn$;

comment on function public.admin_chapter_duration_panel(integer) is
  'ADR-096: per-hoofdstuk-doorlooptijd (chapter_ms) percentielen + traagste-aandeel + traagste-positie. is_test uitgesloten. Leespaneel, geen alarmen.';
revoke all on function public.admin_chapter_duration_panel(integer) from public;
revoke execute on function public.admin_chapter_duration_panel(integer) from anon, authenticated;
grant execute on function public.admin_chapter_duration_panel(integer) to service_role;
