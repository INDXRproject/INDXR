-- HANDMATIG TESTSCRIPT — NIET uitvoeren als migratie
-- Uitvoeren in Supabase Dashboard → SQL Editor na apply van
-- 20260428_playlist_per_video_chain.sql
--
-- Doel: verify dat update_playlist_video_progress correct werkt
-- vóórdat Fase 3b (worker-code) begint.
--
-- Volgorde: voer de blokken één voor één uit. Elk blok heeft een
-- verwacht resultaat in het commentaar.

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 0 — Controleer of de kolom en index aanwezig zijn
-- ─────────────────────────────────────────────────────────────────────────────

-- Verwacht: last_progress_at verschijnt in de kolomlijst
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'playlist_extraction_jobs'
  AND column_name = 'last_progress_at';

-- Verwacht: index idx_playlist_jobs_last_progress zichtbaar
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'playlist_extraction_jobs'
  AND indexname = 'idx_playlist_jobs_last_progress';

-- Verwacht: functie zichtbaar
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_playlist_video_progress';


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 1 — Test-playlist aanmaken (3 video's)
-- ─────────────────────────────────────────────────────────────────────────────

-- Sla het gegenereerde id op voor gebruik in volgende stappen.
-- Tip: kopieer de UUID uit het resultaat en vervang 'PASTE_ID_HERE' hieronder.

INSERT INTO playlist_extraction_jobs (
  user_id,
  status,
  playlist_url,
  playlist_title,
  total_videos,
  completed,
  failed,
  video_ids,
  video_results
) VALUES (
  auth.uid(),                     -- ingelogd als jezelf in SQL editor
  'running',
  'https://youtube.com/playlist?list=TEST',
  'Test Playlist',
  3,                              -- 3 video's totaal
  0,
  0,
  '["vid_aaa", "vid_bbb", "vid_ccc"]',
  '{}'
)
RETURNING id, status, total_videos, completed, failed, last_progress_at;

-- Verwacht:
--   id = <uuid>
--   status = 'running'
--   total_videos = 3, completed = 0, failed = 0
--   last_progress_at = NULL


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 2 — Eerste video succesvol verwerkt
-- Vervang PASTE_ID_HERE door de UUID uit stap 1
-- ─────────────────────────────────────────────────────────────────────────────

SELECT update_playlist_video_progress(
  'PASTE_ID_HERE'::uuid,          -- p_playlist_id
  'vid_aaa',                      -- p_video_id
  'success',                      -- p_status
  gen_random_uuid(),              -- p_transcript_id (nep UUID)
  NULL                            -- p_error_type
);

-- Verwacht returnwaarde:
--   {"playlist_complete": false, "completed": 1, "failed": 0, "total": 3}

-- Controleer state:
SELECT id, status, completed, failed, last_progress_at, video_results
FROM playlist_extraction_jobs
WHERE id = 'PASTE_ID_HERE'::uuid;

-- Verwacht:
--   status = 'running'
--   completed = 1, failed = 0
--   last_progress_at = recent timestamp
--   video_results bevat "vid_aaa": {"status": "success", "transcript_id": "..."}


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 3 — Tweede video met error
-- ─────────────────────────────────────────────────────────────────────────────

SELECT update_playlist_video_progress(
  'PASTE_ID_HERE'::uuid,
  'vid_bbb',
  'error',
  NULL,
  'bot_detection'
);

-- Verwacht returnwaarde:
--   {"playlist_complete": false, "completed": 1, "failed": 1, "total": 3}

SELECT status, completed, failed, video_results -> 'vid_bbb' AS vid_bbb_result
FROM playlist_extraction_jobs
WHERE id = 'PASTE_ID_HERE'::uuid;

-- Verwacht:
--   status = 'running'
--   completed = 1, failed = 1
--   vid_bbb_result = {"status": "error", "error_type": "bot_detection"}


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 4 — Idempotentie: zelfde aanroep voor vid_bbb opnieuw
-- Counters mogen NIET opnieuw verhoogd worden
-- ─────────────────────────────────────────────────────────────────────────────

SELECT update_playlist_video_progress(
  'PASTE_ID_HERE'::uuid,
  'vid_bbb',
  'error',
  NULL,
  'bot_detection'
);

-- Verwacht returnwaarde:
--   {"playlist_complete": false, "completed": 1, "failed": 1, "total": 3}
--   (failed blijft 1, NIET 2)

SELECT completed, failed
FROM playlist_extraction_jobs
WHERE id = 'PASTE_ID_HERE'::uuid;

-- Verwacht: completed = 1, failed = 1 (ongewijzigd)


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 5 — Laatste video: auto-completion check
-- ─────────────────────────────────────────────────────────────────────────────

SELECT update_playlist_video_progress(
  'PASTE_ID_HERE'::uuid,
  'vid_ccc',
  'success',
  gen_random_uuid(),
  NULL
);

-- Verwacht returnwaarde:
--   {"playlist_complete": true, "completed": 2, "failed": 1, "total": 3}
--   (completed + failed = 3 = total_videos → playlist_complete = true)

SELECT status, completed, failed, completed_at, processing_time_seconds
FROM playlist_extraction_jobs
WHERE id = 'PASTE_ID_HERE'::uuid;

-- Verwacht:
--   status = 'complete'
--   completed = 2, failed = 1
--   completed_at = recent timestamp
--   processing_time_seconds > 0


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 6 — Opruimen (optioneel)
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM playlist_extraction_jobs
WHERE id = 'PASTE_ID_HERE'::uuid;

-- Verwacht: 1 rij verwijderd
