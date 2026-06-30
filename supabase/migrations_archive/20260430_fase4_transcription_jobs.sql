-- Fase 4: transcription_jobs uitbreiden
-- credits_deducted: idempotency vlag — TRUE zodra credits zijn afgetrokken voor deze job.
--   Bij worker-restart (ack_late=True) controleert run_whisper_job deze vlag om dubbele
--   aftrek te voorkomen.
-- last_heartbeat_at: pipeline schrijft elke ~60s tijdens download + AssemblyAI-call.
--   GET /api/jobs/{id} markeert job als 'interrupted' als heartbeat > 3 min oud is.

ALTER TABLE transcription_jobs
  ADD COLUMN IF NOT EXISTS credits_deducted  BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
