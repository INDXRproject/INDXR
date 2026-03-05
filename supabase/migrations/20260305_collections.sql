-- Collections table for library organization
CREATE TABLE IF NOT EXISTS collections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add collection_id to transcripts (nullable — transcripts without one appear in "All Transcripts")
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- RLS: users can only access their own collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collections"
  ON collections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast look-ups
CREATE INDEX IF NOT EXISTS idx_transcripts_collection_id ON transcripts(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
