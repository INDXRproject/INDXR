-- F3: per-user daily library_bytes series. The storage-COR formula prorates the CURRENT bytes over any
-- historical window (a May look-back shows July's library size). No historical byte series exists, so this
-- table is the MEASUREMENT: snapshot_finance_day writes one row per external user per night. Insert-only
-- (ON CONFLICT re-writes the same day idempotently). Until it spans a window, storage falls back to stand-now
-- with a storage_approx flag.
CREATE TABLE IF NOT EXISTS public.daily_library_bytes (
  day           date   NOT NULL,
  user_id       uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_bytes bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, user_id)
);
CREATE INDEX IF NOT EXISTS idx_dlb_day ON public.daily_library_bytes (day);

ALTER TABLE public.daily_library_bytes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own library bytes" ON public.daily_library_bytes
  FOR SELECT USING (user_id = auth.uid());
