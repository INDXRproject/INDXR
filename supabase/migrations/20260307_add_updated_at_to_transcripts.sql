-- Add updated_at column to transcripts for tracking last modification time
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows: set updated_at = created_at where null
UPDATE transcripts SET updated_at = created_at WHERE updated_at IS NULL;

-- Index for performance (ordering by modified date)
CREATE INDEX IF NOT EXISTS transcripts_updated_at_idx ON transcripts(updated_at DESC);
