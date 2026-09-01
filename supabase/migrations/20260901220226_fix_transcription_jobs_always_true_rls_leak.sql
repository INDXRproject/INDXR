-- CRITICAL RLS LEAK FIX (Supabase advisor rls_policy_always_true, geverifieerd 2026-09-02):
-- public.transcription_jobs had een PERMISSIVE policy "Service role can do everything" met
-- roles={public}, cmd=ALL, USING true, WITH CHECK true. Omdat PERMISSIVE-policies met OR combineren,
-- overrulede deze de bedoelde "Users can view own jobs" (SELECT, auth.uid()=user_id): élke anon-key-
-- of ingelogde caller kon ALLE 300 jobs van alle 7 users lezen EN muteren (bewezen: anon 300/300,
-- test1 300/300 i.p.v. 7). service_role/postgres hebben BYPASSRLS → hadden deze policy nooit nodig
-- (de naam was misleidend; het was een PUBLIC-allow-all). Geen enkele client schrijft transcription_jobs
-- (alle callsites zijn SELECT: useJobStatus/ActiveJobsIndicator/SummaryTab/useCompletionReceipt); de
-- backend schrijft via service_role (BYPASSRLS). Dropten van de policy laat "Users can view own jobs"
-- als enige policy → authenticated ziet alleen eigen jobs, anon ziet niets, writes door client geweigerd.
-- Toegepast via Supabase MCP op 2026-09-02 (version 20260901220226); dit bestand houdt de repo in sync.
DROP POLICY IF EXISTS "Service role can do everything" ON public.transcription_jobs;

COMMENT ON TABLE public.transcription_jobs IS
  'Job-tabel voor AI-transcriptie, ai_summary en playlist-videos. RLS: "Users can view own jobs" (SELECT, auth.uid()=user_id) is het ENIGE beleid — clients lezen alleen eigen jobs (Realtime useJobStatus incl.), clients schrijven NIET. Alle writes via de Python-backend met de service-role key (BYPASSRLS). Voeg NOOIT een USING true / PUBLIC-allow-all policy toe (was de rls_policy_always_true-leak, gedicht 2026-09-02).';
