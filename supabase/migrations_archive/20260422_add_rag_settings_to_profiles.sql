ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rag_export_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_chunk_size       INTEGER NOT NULL DEFAULT 60
    CONSTRAINT rag_chunk_size_valid CHECK (rag_chunk_size IN (30, 60, 120));
