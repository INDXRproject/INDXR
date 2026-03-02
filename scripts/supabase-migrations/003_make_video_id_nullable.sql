-- Fix transcripts table for audio uploads
-- video_id should be nullable since audio uploads don't have video IDs

-- Make video_id nullable
ALTER TABLE transcripts 
ALTER COLUMN video_id DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transcripts' AND column_name = 'video_id';
