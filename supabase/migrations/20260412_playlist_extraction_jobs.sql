CREATE TABLE IF NOT EXISTS playlist_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running',
  playlist_url TEXT,
  playlist_title TEXT,
  total_videos INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  current_video_index INTEGER DEFAULT 0,
  current_video_title TEXT,
  video_ids JSONB DEFAULT '[]',
  video_results JSONB DEFAULT '{}',
  use_whisper_ids JSONB DEFAULT '[]',
  collection_id UUID,
  processing_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE playlist_extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own jobs" ON playlist_extraction_jobs FOR ALL USING (auth.uid() = user_id);
