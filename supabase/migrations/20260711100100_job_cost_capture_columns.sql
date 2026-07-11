-- Per-job cost-capture columns (all NULLABLE / additive → non-breaking for existing INSERT paths).
--
-- transcription_jobs.proxy_bytes      : raw Decodo egress bytes for the paid YT-AI/whisper route.
--    The audio download (audio_utils.extract_youtube_audio) measures raw_size pre-ffmpeg = the true
--    proxy egress, but currently logs+drops it. We persist it here. file_size_bytes is left untouched
--    (it is upload-only: len(uploaded audio); 0 for the YouTube route by design).
-- transcription_jobs.assemblyai_model : the EFFECTIVE model AssemblyAI ran (speech_model_used from the
--    response), captured at job time. The € rate is NOT stored on the job — it comes from cost_config
--    at display time (effective_from), so a rate change doesn't rewrite history.
-- transcripts.ai_summary_usage        : DeepSeek token usage {prompt_tokens, completion_tokens,
--    total_tokens, model} for the summary. Co-located with the artifact, written atomically with the
--    summary. INFORMATIONAL (summaries are billed flat 3 credits). Overwritten on regenerate (last run).

ALTER TABLE public.transcription_jobs
    ADD COLUMN IF NOT EXISTS proxy_bytes      bigint,
    ADD COLUMN IF NOT EXISTS assemblyai_model text;

COMMENT ON COLUMN public.transcription_jobs.proxy_bytes IS
    'Raw Decodo proxy egress bytes (pre-ffmpeg audio) for the YT-AI/whisper route. NULL for upload/caption paths.';
COMMENT ON COLUMN public.transcription_jobs.assemblyai_model IS
    'Effective AssemblyAI speech_model_used at job time (e.g. universal-3-pro). NULL for non-AssemblyAI jobs.';

ALTER TABLE public.transcripts
    ADD COLUMN IF NOT EXISTS ai_summary_usage jsonb;

COMMENT ON COLUMN public.transcripts.ai_summary_usage IS
    'DeepSeek token usage for the last AI summary generation {prompt_tokens, completion_tokens, total_tokens, model}. Informational (flat 3cr billing).';
