CREATE TABLE IF NOT EXISTS playlist_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_url TEXT,
  playlist_title TEXT,
  total_selected INTEGER DEFAULT 0,
  total_succeeded INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  failed_bot_detection INTEGER DEFAULT 0,
  failed_timeout INTEGER DEFAULT 0,
  failed_age_restricted INTEGER DEFAULT 0,
  failed_members_only INTEGER DEFAULT 0,
  failed_other INTEGER DEFAULT 0,
  processing_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE playlist_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own playlist jobs" ON playlist_jobs FOR ALL USING (auth.uid() = user_id);
