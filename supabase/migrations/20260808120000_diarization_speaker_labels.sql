-- Sprekerherkenning (diarisatie) — kosten + opslag.
--
-- AssemblyAI speaker_labels is een async ADD-ON die additief op het modeltarief stapelt
-- (NIET in het basistarief): standaard +$0.02/uur (experimenteel +$0.065/uur). We draaien
-- standaard. Zie assemblyai_client._TRANSCRIPTION_CONFIG (speaker_labels=True) — geldt voor
-- élke AI-transcriptie (upload + YouTube-AI), niet voor captions (die lopen niet langs AssemblyAI).
--
-- Deze migratie:
--   1) cost_config.assemblyai_diarization_usd_per_hour ($0.02, USD opgeslagen; FX via usd_eur_rate).
--   2) transcription_jobs.diarization (per-job vlag; nieuwe AI-jobs=true, legacy=false → geen
--      retroactieve COR-verschuiving). Gezet bij completion in _submit_and_poll (dus alleen echte
--      AssemblyAI-runs, niet cache-hits (COR=0) en niet ai_summary-jobs (lopen via run_summary_job,
--      krijgen deze vlag nooit → add-on=0 ook waar de ai_summary-filter in subquery `a` ontbreekt)).
--   3) transcripts.speaker_names (jsonb {"A":"Alice",...}) — hernoemtoewijzing APART van de
--      transcripttekst opgeslagen; toegepast bij tonen + export. Origineel altijd herstelbaar.
--   4) helper assemblyai_diarization_eur_per_min() (mirror van assemblyai_stt_eur_per_min, ADR-070).
--   5) _geld_scope: de add-on-COR toegevoegd aan de TWEE bestaande STT-COR-expressies (scope-totaal
--      v_stt_audio_eur + per-user against-revenue subquery `a`), conditioneel op diarization. De rest
--      is VERBATIM uit de live functiedefinitie (pg_get_functiondef, source of truth — die bevat de
--      ADR-090 source_kind-filters en per-model summary-COR die in oude migratiebestanden ontbraken).
--
-- SAFETY: raakt alleen COR aan. Geen wijziging aan _sale_vat/omzet/VAT-recognitie. Beide STT-plekken
-- gebruiken dezelfde add-on-helper → "against_revenue + goodwill = total COR"-reconciliatie intact.
-- Creditprijs voor de gebruiker verandert NIET. snapshot_finance_day/admin_finance_summary/
-- admin_geld_summary routeren allemaal door _geld_scope (geverifieerd) → één enkele COR-bron.

-- 1) Diarisatie-add-on tarief.
ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS assemblyai_diarization_usd_per_hour numeric(12,6);

UPDATE public.cost_config SET
  assemblyai_diarization_usd_per_hour = 0.02,
  notes = COALESCE(notes,'') ||
    ' | 2026-08-08 diarisatie: speaker_labels async add-on = $0.02/hr (standaard), additief op het '
    'modeltarief, NIET in het basistarief (AssemblyAI-prijspagina). Geen EU-premie (EU=US, zoals STT). '
    'USD->EUR via usd_eur_rate at query. Alleen geteld voor transcription_jobs.diarization=true.';

-- 2) Per-job diarisatie-vlag.
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS diarization boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transcription_jobs.diarization IS
  'True als speaker_labels (diarisatie) aanstond bij deze AssemblyAI-run → +$0.02/u add-on-COR in _geld_scope. Legacy/cache-hit/ai_summary = false.';

-- 3) Hernoemtoewijzing per transcript, apart van de transcripttekst.
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS speaker_names jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.transcripts.speaker_names IS
  'Spreker-hernoemtoewijzing {"A":"Alice","B":"Bob"}. Overlay toegepast bij tonen + export; de labels in transcript.transcript[].speaker blijven ongemoeid → origineel altijd herstelbaar, één keer hernoemen = overal.';

-- 4) EUR/min diarisatie-add-on helper (mirror van assemblyai_stt_eur_per_min, ADR-070).
CREATE OR REPLACE FUNCTION public.assemblyai_diarization_eur_per_min()
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $fn$
  SELECT (COALESCE(c.assemblyai_diarization_usd_per_hour,0) / 60.0 * COALESCE(c.usd_eur_rate,1))
  FROM public.cost_config c
  ORDER BY c.effective_from DESC
  LIMIT 1;
$fn$;

COMMENT ON FUNCTION public.assemblyai_diarization_eur_per_min() IS
  'EUR/min diarisatie-add-on (speaker_labels). USD/uur uit cost_config, FX via usd_eur_rate. Alleen toepassen op transcription_jobs.diarization=true.';

REVOKE ALL ON FUNCTION public.assemblyai_diarization_eur_per_min() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assemblyai_diarization_eur_per_min() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assemblyai_diarization_eur_per_min() TO service_role;

-- 5) _geld_scope: add-on-COR bij de twee STT-COR-expressies. Rest VERBATIM uit de live definitie.
CREATE OR REPLACE FUNCTION public._geld_scope(p_internal boolean, p_from timestamp with time zone DEFAULT '-infinity'::timestamp with time zone, p_to timestamp with time zone DEFAULT 'infinity'::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg public.cost_config%ROWTYPE; users uuid[];
  v_purchased_cr numeric := 0; v_gross numeric := 0; v_vat numeric := 0;
  v_vat_unmeas_n integer := 0; v_vat_unmeas_gross numeric := 0; v_vat_by_country jsonb := '{}'::jsonb;
  v_granted_cr numeric := 0; v_consumed_cr numeric := 0;
  v_cons_ai numeric := 0; v_cons_cap numeric := 0; v_cons_sum numeric := 0; v_cons_rag numeric := 0;
  v_balance_cr numeric := 0; rec_to jsonb; rec_from jsonb;
  v_recognized numeric := 0; v_deferred numeric := 0; v_cons_purch_to numeric := 0; v_consumed_to numeric := 0;
  v_per_credit_net numeric := 0;
  v_dur_sec numeric := 0; v_proxy_bytes numeric := 0; v_prompt_tok numeric := 0; v_compl_tok numeric := 0; v_cache_tok numeric := 0;
  v_stt_audio_eur numeric := 0;
  v_proxy_fail_bytes numeric := 0;
  v_cor_ai numeric := 0; v_cor_cap numeric := 0; v_cor_sum numeric := 0; v_cor_rag numeric := 0; v_cor_total numeric := 0;
  v_purchased_share numeric := 0; v_cor_rev numeric := 0; v_granted_deliv numeric := 0; v_gross_profit numeric := 0;
  v_ar_ai numeric := 0; v_ar_cap numeric := 0; v_ar_sum numeric := 0; v_ar_sto numeric := 0; v_goodwill numeric := 0;
  v_recognized_fee numeric := 0; v_deferred_fee numeric := 0; v_deferred_credits numeric := 0; v_purchased_fee numeric := 0;
  v_cap_paid_bytes numeric := 0; v_cap_free_bytes numeric := 0; v_funnel_free_cap numeric := 0;
  v_seg_free_ll jsonb; v_seg_paid_after jsonb; v_seg_paid_cap jsonb;
  v_from_d date; v_to_d date; v_days_win numeric := 1; v_days_month numeric := 1;
  v_stor_bytes numeric := 0; v_stor_gb numeric := 0; v_cor_sto numeric := 0;
  v_storage_approx boolean := false; v_series_min date;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users FROM public.profiles WHERE is_internal = p_internal;

  SELECT COALESCE(sum(gross),0),
         COALESCE(sum(COALESCE((sv->>'vat')::numeric,0)),0),
         COALESCE(sum(cr),0),
         COALESCE(count(*) FILTER (WHERE sv->>'status'='unknown'),0),
         COALESCE(sum(gross) FILTER (WHERE sv->>'status'='unknown'),0)
    INTO v_gross, v_vat, v_purchased_cr, v_vat_unmeas_n, v_vat_unmeas_gross
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount AS cr,
      COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross,
      public._sale_vat(ct.metadata) AS sv,
      ct.metadata->>'customer_country' AS country
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at >= p_from AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  SELECT COALESCE(jsonb_object_agg(country, obj), '{}'::jsonb) INTO v_vat_by_country FROM (
    SELECT COALESCE(country,'??') AS country,
      jsonb_build_object(
        'vat', round(sum(COALESCE((sv->>'vat')::numeric,0)),2),
        'gross', round(sum(gross),2),
        'count', count(*),
        'unknown_vat', bool_or(sv->>'status'='unknown'),
        'rate_implied', CASE WHEN sum(gross) > sum(COALESCE((sv->>'vat')::numeric,0))
                          THEN round(sum(COALESCE((sv->>'vat')::numeric,0)) / (sum(gross) - sum(COALESCE((sv->>'vat')::numeric,0))),4)
                          ELSE NULL END
      ) AS obj
    FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
        COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross,
        public._sale_vat(ct.metadata) AS sv,
        ct.metadata->>'customer_country' AS country
      FROM public.credit_transactions ct
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
        AND ct.created_at >= p_from AND ct.created_at < p_to
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s2 GROUP BY COALESCE(country,'??')
  ) g;

  SELECT COALESCE(sum(amount),0) INTO v_granted_cr
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  SELECT COALESCE(sum(amount),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_transcription'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='caption'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_summary'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='rag'),0)
    INTO v_consumed_cr, v_cons_ai, v_cons_cap, v_cons_sum, v_cons_rag
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  SELECT COALESCE(sum(credits),0) INTO v_balance_cr FROM public.user_credits WHERE user_id = ANY(users);

  SELECT COALESCE(sum(duration_seconds),0), COALESCE(sum(proxy_bytes),0) INTO v_dur_sec, v_proxy_bytes
  FROM public.transcription_jobs
  WHERE status='complete' AND cache_hit = false AND source_kind IS DISTINCT FROM 'ai_summary' AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;
  -- Per-model STT COR (ADR-070): rate keyed on the RECORDED EFFECTIVE model per job
  -- (assemblyai_model), never a scope-average; NULL/unknown legacy -> documented fallback.
  -- Diarisatie-add-on (+$0.02/u) conditioneel op de per-job vlag (legacy=false → geen add-on).
  SELECT COALESCE(sum((duration_seconds/60.0) * (
           public.assemblyai_stt_eur_per_min(assemblyai_model)
           + CASE WHEN COALESCE(diarization,false) THEN public.assemblyai_diarization_eur_per_min() ELSE 0 END
         )),0)
    INTO v_stt_audio_eur
  FROM public.transcription_jobs
  WHERE status='complete' AND cache_hit = false AND source_kind IS DISTINCT FROM 'ai_summary' AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;
  v_cor_ai := v_stt_audio_eur + (v_proxy_bytes/1e9)*cfg.decodo_eur_per_gb;

  SELECT COALESCE(sum(proxy_bytes),0) INTO v_proxy_fail_bytes
  FROM public.transcription_jobs
  WHERE status <> 'complete' AND source_kind IS DISTINCT FROM 'ai_summary' AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;

  SELECT COALESCE(sum(prompt_tokens),0), COALESCE(sum(completion_tokens),0), COALESCE(sum(cache_hit_tokens),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.ai_summary_usage_log
  WHERE user_id = ANY(users) AND generated_at >= p_from AND generated_at < p_to;
  SELECT COALESCE(sum(
      (GREATEST(prompt_tokens - cache_hit_tokens,0)/1e6)
        * CASE WHEN model LIKE 'claude-sonnet-4-6%' THEN cfg.assemblyai_llm_sonnet_usd_per_1m_input_tokens
               ELSE cfg.assemblyai_llm_usd_per_1m_input_tokens END
      + (completion_tokens/1e6)
        * CASE WHEN model LIKE 'claude-sonnet-4-6%' THEN cfg.assemblyai_llm_sonnet_usd_per_1m_output_tokens
               ELSE cfg.assemblyai_llm_usd_per_1m_output_tokens END
    ) * COALESCE(cfg.usd_eur_rate,1), 0) INTO v_cor_sum
    FROM public.ai_summary_usage_log
    WHERE user_id = ANY(users) AND generated_at >= p_from AND generated_at < p_to;

  SELECT COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used > 0), 0),
         COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used = 0), 0)
    INTO v_cap_paid_bytes, v_cap_free_bytes
  FROM public.usage_logs
  WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal AND created_at >= p_from AND created_at < p_to;
  v_cor_cap := (v_cap_paid_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_funnel_free_cap := (v_cap_free_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_cor_rag := 0; v_cor_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag;

  IF p_from > '-infinity'::timestamptz AND p_to < 'infinity'::timestamptz THEN
    v_from_d := (p_from AT TIME ZONE 'Europe/Amsterdam')::date;
    v_to_d   := (p_to   AT TIME ZONE 'Europe/Amsterdam')::date;
    v_days_win   := GREATEST(1, (v_to_d - v_from_d));
    v_days_month := EXTRACT(DAY FROM (date_trunc('month', p_to::timestamp) + interval '1 month - 1 day'));
  END IF;
  IF NOT p_internal THEN
    SELECT min(day) INTO v_series_min FROM public.daily_library_bytes;
    v_storage_approx := NOT (v_series_min IS NOT NULL AND v_from_d IS NOT NULL AND v_series_min <= v_from_d);
    IF v_storage_approx THEN
      SELECT COALESCE(sum(uc.library_bytes),0) INTO v_stor_bytes
      FROM public.user_credits uc WHERE uc.user_id = ANY(users);
    ELSE
      SELECT COALESCE(sum(b.bytes),0) INTO v_stor_bytes FROM (
        SELECT DISTINCT ON (l.user_id) l.library_bytes AS bytes
        FROM public.daily_library_bytes l
        WHERE l.user_id = ANY(users) AND l.day < v_to_d
        ORDER BY l.user_id, l.day DESC
      ) b;
    END IF;
    v_stor_gb := v_stor_bytes / 1e9;
    v_cor_sto := GREATEST(0, v_stor_gb - COALESCE(cfg.r2_free_gb,0))
                 * COALESCE(cfg.r2_usd_per_gb_month,0) * COALESCE(cfg.usd_eur_rate,1)
                 * (v_days_win / v_days_month);
  END IF;

  rec_to := public._recognize_asof(users, p_to); rec_from := public._recognize_asof(users, p_from);
  v_recognized     := (rec_to->>'recognized')::numeric - (rec_from->>'recognized')::numeric;
  v_deferred       := (rec_to->>'deferred')::numeric;
  v_deferred_fee   := (rec_to->>'deferred_fee')::numeric;
  v_deferred_credits := (rec_to->>'deferred_credits')::numeric;
  v_recognized_fee := (rec_to->>'recognized_fee')::numeric - (rec_from->>'recognized_fee')::numeric;
  v_purchased_fee  := (rec_to->>'purchased_fee')::numeric - (rec_from->>'purchased_fee')::numeric;
  v_cons_purch_to  := (rec_to->>'purchased_consumed')::numeric;
  v_consumed_to    := (rec_to->>'consumed_cr')::numeric;
  v_per_credit_net := CASE WHEN (rec_to->>'purchased_cr')::numeric > 0
                        THEN (rec_to->>'purchased_net')::numeric / (rec_to->>'purchased_cr')::numeric ELSE 0 END;
  v_purchased_share := CASE WHEN v_consumed_to > 0 THEN v_cons_purch_to / v_consumed_to ELSE 0 END;

  SELECT
    COALESCE(sum(uc.ai  * sh.share),0),
    COALESCE(sum(uc.cap * sh.share),0),
    COALESCE(sum(uc.sm  * sh.share),0),
    COALESCE(sum(uc.st  * sh.share),0),
    COALESCE(sum((uc.ai + uc.cap + uc.sm + uc.st) * (1 - sh.share)),0)
  INTO v_ar_ai, v_ar_cap, v_ar_sum, v_ar_sto, v_goodwill
  FROM (
    SELECT gu AS uid, COALESCE(a.c,0) AS ai, COALESCE(c.c,0) AS cap, COALESCE(s.c,0) AS sm,
      CASE WHEN NOT p_internal AND v_stor_bytes > 0 THEN
        v_cor_sto * (
          CASE WHEN v_storage_approx
            THEN (SELECT COALESCE(uc2.library_bytes,0) FROM public.user_credits uc2 WHERE uc2.user_id = gu)
            ELSE (SELECT COALESCE(l.library_bytes,0) FROM public.daily_library_bytes l
                   WHERE l.user_id = gu AND l.day < v_to_d ORDER BY l.day DESC LIMIT 1)
          END
        ) / v_stor_bytes
        ELSE 0 END AS st
    FROM unnest(users) AS gu
    LEFT JOIN (
      SELECT user_id, COALESCE(sum((duration_seconds/60.0)*(
               public.assemblyai_stt_eur_per_min(assemblyai_model)
               + CASE WHEN COALESCE(diarization,false) THEN public.assemblyai_diarization_eur_per_min() ELSE 0 END
             )),0) + COALESCE(sum(proxy_bytes),0)/1e9*cfg.decodo_eur_per_gb AS c
      FROM public.transcription_jobs
      WHERE status='complete' AND cache_hit=false AND created_at >= p_from AND created_at < p_to
      GROUP BY user_id
    ) a ON a.user_id = gu
    LEFT JOIN (
      SELECT user_id, COALESCE(sum(proxy_bytes),0)/1e9*cfg.decodo_eur_per_gb AS c
      FROM public.usage_logs
      WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal AND credits_used > 0
        AND created_at >= p_from AND created_at < p_to
      GROUP BY user_id
    ) c ON c.user_id = gu
    LEFT JOIN (
      SELECT user_id,
        GREATEST(COALESCE(sum(prompt_tokens),0) - COALESCE(sum(cache_hit_tokens),0),0)/1000.0*(cfg.assemblyai_llm_usd_per_1m_input_tokens/1000.0*COALESCE(cfg.usd_eur_rate,1))
        + COALESCE(sum(cache_hit_tokens),0)/1000.0*(0)
        + COALESCE(sum(completion_tokens),0)/1000.0*(cfg.assemblyai_llm_usd_per_1m_output_tokens/1000.0*COALESCE(cfg.usd_eur_rate,1)) AS c
      FROM public.ai_summary_usage_log
      WHERE generated_at >= p_from AND generated_at < p_to
      GROUP BY user_id
    ) s ON s.user_id = gu
  ) uc
  CROSS JOIN LATERAL (
    SELECT CASE WHEN pcons > 0 THEN ppc / pcons ELSE 0 END AS share
    FROM (SELECT
       COALESCE((rec_to->'by_user'->(uc.uid::text)->>'purchased_consumed')::numeric,0) - COALESCE((rec_from->'by_user'->(uc.uid::text)->>'purchased_consumed')::numeric,0) AS ppc,
       COALESCE((rec_to->'by_user'->(uc.uid::text)->>'consumed_cr')::numeric,0) - COALESCE((rec_from->'by_user'->(uc.uid::text)->>'consumed_cr')::numeric,0) AS pcons
    ) qq
  ) sh;

  v_cor_rev := v_ar_ai + v_ar_cap + v_ar_sum + v_ar_sto + v_recognized_fee;
  v_granted_deliv := v_goodwill;
  v_gross_profit := v_recognized - v_cor_rev;

  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_free_ll
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=false
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_paid_after
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=true
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_paid_cap
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used>0
     AND created_at >= p_from AND created_at < p_to;

  RETURN jsonb_build_object(
    'cash_in_gross', round(v_gross,2),
    'vat', round(v_vat,2),
    'vat_measured_all', (v_vat_unmeas_n = 0),
    'vat_unmeasured_count', v_vat_unmeas_n,
    'vat_unmeasured_gross', round(v_vat_unmeas_gross,2),
    'vat_by_country', v_vat_by_country,
    'revenue_net', round(v_gross - v_vat,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit_net,4),
    'consumed_purchased_cr', v_cons_purch_to,
    'recognized_revenue', round(v_recognized,2),
    'deferred_revenue', round(v_deferred,2),
    'deferred_credits', v_deferred_credits,
    'recognized_fee', round(v_recognized_fee,4),
    'deferred_fee', round(v_deferred_fee,4),
    'purchased_fee', round(v_purchased_fee,4),
    'consumed_by_type', jsonb_build_object('ai_transcription', v_cons_ai, 'caption', v_cons_cap, 'ai_summary', v_cons_sum, 'rag', v_cons_rag),
    'cor', jsonb_build_object('ai_transcription', round(v_cor_ai,4), 'caption', round(v_cor_cap,4),
      'ai_summary', round(v_cor_sum,4), 'rag', round(v_cor_rag,4), 'storage', round(v_cor_sto,4), 'total', round(v_cor_total,4)),
    'cor_caption_estimated', false,
    'cor_against_revenue', round(v_cor_rev,4),
    'against_revenue_by_method', jsonb_build_object('ai_transcription', round(v_ar_ai,4), 'caption', round(v_ar_cap,4),
      'ai_summary', round(v_ar_sum,4), 'rag', 0, 'storage', round(v_ar_sto,4), 'payment_fee', round(v_recognized_fee,4)),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'funnel_free_caption_cost', round(v_funnel_free_cap,4),
    'caption_segments', jsonb_build_object('free_loggedin', v_seg_free_ll, 'paid_after', v_seg_paid_after, 'paid_caption', v_seg_paid_cap),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END,
    'purchased_share', round(v_purchased_share,6),
    'storage_bytes', v_stor_bytes,
    'storage_approx', v_storage_approx,
    'proxy_fail_bytes', v_proxy_fail_bytes,
    'drivers', jsonb_build_object(
      'ai_transcription', jsonb_build_object('audio_seconds', v_dur_sec, 'proxy_bytes', v_proxy_bytes),
      'caption', jsonb_build_object('proxy_bytes', v_cap_paid_bytes),
      'ai_summary', jsonb_build_object('input_tokens', v_prompt_tok, 'cache_tokens', v_cache_tok, 'output_tokens', v_compl_tok),
      'storage', jsonb_build_object('gb', round(v_stor_gb,6), 'free_gb', COALESCE(cfg.r2_free_gb,0),
        'days_win', v_days_win, 'days_month', v_days_month),
      'funnel_loggedin', jsonb_build_object('proxy_bytes', v_cap_free_bytes))
  );
END;
$function$;
