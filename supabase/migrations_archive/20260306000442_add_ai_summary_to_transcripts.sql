-- Add AI summary column to transcripts table
ALTER TABLE public.transcripts
ADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL;
