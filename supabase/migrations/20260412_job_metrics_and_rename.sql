-- Rename whisper_jobs to transcription_jobs (reflects AssemblyAI, not Whisper)
ALTER TABLE whisper_jobs RENAME TO transcription_jobs;

-- Add processing metrics columns
ALTER TABLE transcription_jobs ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE transcription_jobs ADD COLUMN IF NOT EXISTS file_format TEXT DEFAULT 'unknown';
ALTER TABLE transcription_jobs ADD COLUMN IF NOT EXISTS processing_time_seconds INTEGER DEFAULT 0;
