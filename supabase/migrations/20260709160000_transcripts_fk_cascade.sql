-- transcripts.user_id → auth.users was ON DELETE NO ACTION: deleting a user WITH transcripts
-- would be blocked (the one non-CASCADE user-FK; verified 2026-07-09 via pg_constraint, alongside
-- usage_logs=SET NULL). Switch to ON DELETE CASCADE so a deleted account takes its transcripts
-- with it — consistent with credit_transactions/jobs/collections/etc. which already CASCADE.
-- SAFE: verified 0 orphaned transcripts and every transcript maps to a live auth.users row, so the
-- constraint re-validates cleanly and NOTHING is deleted now — only the future delete behaviour changes.
ALTER TABLE public.transcripts DROP CONSTRAINT transcripts_user_id_fkey;
ALTER TABLE public.transcripts
  ADD CONSTRAINT transcripts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
