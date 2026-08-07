-- ADR-090: admin_operations_v3 filtert job-level al op source_kind IN ('single','upload'); de UNIT-LEVEL
-- aggregaten tellen bewust breed (incl. playlist), maar zonder guard ook ai_summary. Twee clauses zonder
-- kolom-guard (die summary anders niet uitsluit) krijgen source_kind IS DISTINCT FROM 'ai_summary'. De overige
-- ongefilterde clauses sluiten summary al uit via hun eigen guards (submitted_at/proxy_bytes/assemblyai_*/status).
DO $mig$
DECLARE d text; d0 text; n1 int; n2 int;
BEGIN
  d := pg_get_functiondef('admin_operations_v3(timestamptz,timestamptz,boolean)'::regprocedure);

  SELECT count(*) INTO n1 FROM regexp_matches(d, 'transcription_jobs t WHERE \(NOT p_exclude_internal', 'g');
  IF n1 <> 1 THEN RAISE EXCEPTION 'ADR-090 v3: clause-12 anchor count=% (verwacht 1)', n1; END IF;

  SELECT count(*) INTO n2 FROM regexp_matches(d, 'transcription_jobs t WHERE\s+\(p_from IS NULL OR t\.created_at>=p_from\)', 'g');
  IF n2 <> 1 THEN RAISE EXCEPTION 'ADR-090 v3: clause-5 anchor count=% (verwacht 1)', n2; END IF;

  d0 := d;
  d := replace(d,
    'transcription_jobs t WHERE (NOT p_exclude_internal',
    'transcription_jobs t WHERE t.source_kind IS DISTINCT FROM ''ai_summary'' AND (NOT p_exclude_internal');
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 v3: clause-12 replace matched niets'; END IF;

  d0 := d;
  d := regexp_replace(d,
    '(transcription_jobs t WHERE)(\s+\(p_from IS NULL OR t\.created_at>=p_from\))',
    $r$\1 t.source_kind IS DISTINCT FROM 'ai_summary' AND\2$r$);
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 v3: clause-5 replace matched niets'; END IF;

  EXECUTE d;
END $mig$;
