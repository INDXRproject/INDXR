-- Fase 4: saved_videos tabel
-- Gebruikers kunnen gefaalde playlist-videos (of handmatig gekozen videos) opslaan
-- voor een latere transcriptie-batch. Zie F2 (wrap-up UX) en F4 (dashboard SavedVideosSection).
--
-- source: 'manual' (gebruiker kiest zelf) of 'playlist_failure' (automatisch vanuit wrap-up).
-- source_playlist_name: alleen gevuld bij source = 'playlist_failure'.

-- ─── 1. Tabel ─────────────────────────────────────────────────────────────────

CREATE TABLE saved_videos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id             TEXT        NOT NULL,
  title                TEXT        NOT NULL,
  duration_seconds     INTEGER,
  channel              TEXT,
  thumbnail_url        TEXT,
  source               TEXT        NOT NULL DEFAULT 'manual', -- 'manual' | 'playlist_failure'
  source_playlist_name TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 2. Index ─────────────────────────────────────────────────────────────────
-- Alle user-facing queries filteren op user_id; partial index niet nodig (geen status-kolom).

CREATE INDEX idx_saved_videos_user_id ON saved_videos (user_id);


-- ─── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own saved_videos"
  ON saved_videos FOR ALL
  USING (auth.uid() = user_id);
