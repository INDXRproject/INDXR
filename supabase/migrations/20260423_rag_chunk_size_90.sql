ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rag_chunk_size_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_rag_chunk_size_check CHECK (rag_chunk_size IN (30, 60, 90, 120));
