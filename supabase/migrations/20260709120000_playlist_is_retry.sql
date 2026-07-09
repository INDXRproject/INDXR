-- ADR-051 / Policy-K fix: retry-/retry-all playlist jobs must NOT re-grant the first-3-free tier.
-- A retry job is a new playlist_extraction_jobs row with a subset of video_ids; without this flag
-- its first ≤3 caption videos would be free again (revenue leak). The backend reservation
-- (_compute_playlist_reservation) and the worker settle (process_playlist_video / _retries)
-- both read this column to force is_free = (idx < 3) AND NOT is_retry — keeping reserve==settle.
ALTER TABLE public.playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS is_retry boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.playlist_extraction_jobs.is_retry IS
  'True for retry-/retry-all jobs (frontend Retry). Suppresses the first-3-free caption tier '
  'server-side so a retry subset is charged like any paid videos. Mirror-invariant: reserve==settle.';
