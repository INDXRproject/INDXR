-- Production-Ready Transcript Management - Database Migration
-- Run this in Supabase SQL Editor

-- Add new columns to transcripts table
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'youtube',
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS credits_used INTEGER,
ADD COLUMN IF NOT EXISTS processing_method TEXT;

-- Create index for faster queries by source type
CREATE INDEX IF NOT EXISTS idx_transcripts_source_type 
ON transcripts(source_type);

-- Create index for user + source type queries
CREATE INDEX IF NOT EXISTS idx_transcripts_user_source 
ON transcripts(user_id, source_type);

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transcripts'
ORDER BY ordinal_position;
