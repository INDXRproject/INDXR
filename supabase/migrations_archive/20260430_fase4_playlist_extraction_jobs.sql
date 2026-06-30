-- Fase 4: playlist_extraction_jobs uitbreiden
-- last_heartbeat_at: worker schrijft elke ~60s tijdens video-verwerking.
--   GET /api/playlist/jobs/{id} markeert job als 'interrupted' als heartbeat > 3 min oud.
-- video_metadata: gevuld bij aanmaak vanuit PlaylistInfoResponse.entries.
--   Structuur: {"video_id": {"title": "...", "duration": 123.4, "thumbnail": "..."}}
--   Gebruikt door de wrap-up UI om gefaalde videos bij naam te tonen.

ALTER TABLE playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_metadata    JSONB DEFAULT '{}';
