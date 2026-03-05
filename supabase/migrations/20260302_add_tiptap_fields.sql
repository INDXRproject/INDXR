-- Add Tiptap editor fields to transcripts table
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS edited_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;
