-- Add viewed_at column to transcripts for 'New' badge tracking
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS transcripts_viewed_at_idx ON transcripts(viewed_at);
