-- ADR-090: admin_operations_summary (hoofd-admin dashboard) telt transcription_jobs zonder source_kind-filter.
-- Sluit ai_summary-jobs uit van álle 6 job-tellingen (gedeelde interne-filter-substring). IS DISTINCT FROM
-- sluit NULL-legacy correct in. Guarded (RAISE bij afwijkend anchoraantal).
DO $mig$
DECLARE d text; d0 text; n int;
BEGIN
  d := pg_get_functiondef('admin_operations_summary(timestamptz,timestamptz,boolean)'::regprocedure);
  SELECT count(*) INTO n FROM regexp_matches(d,
    '\(NOT p_exclude_internal OR NOT \(tj\.user_id = ANY\(v_internal\)\)\)', 'g');
  IF n <> 6 THEN RAISE EXCEPTION 'ADR-090 admin_operations_summary: verwachtte 6 anchors, vond %', n; END IF;
  d0 := d;
  d := replace(d,
    '(NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)))',
    '(NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal))) AND tj.source_kind IS DISTINCT FROM ''ai_summary''');
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 admin_operations_summary: replace matched niets'; END IF;
  EXECUTE d;
END $mig$;
