-- Watchdog crash-recovery: bijhoudt hoeveel keer de watchdog een job opnieuw heeft geënqueued.
-- 0 = nog niet geprobeerd, 1 = één re-enqueue gedaan (limieten: max 1 re-enqueue per job).
-- Wordt door watchdog_interrupted_jobs() in worker.py verhoogd bij elke re-enqueue poging.

ALTER TABLE transcription_jobs
  ADD COLUMN IF NOT EXISTS watchdog_attempts INTEGER DEFAULT 0;

ALTER TABLE playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS watchdog_attempts INTEGER DEFAULT 0;
