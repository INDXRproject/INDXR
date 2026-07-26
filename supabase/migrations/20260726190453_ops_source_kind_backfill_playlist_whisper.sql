-- Toegepast via Supabase MCP apply_migration (version 20260726190453) — repo-sync.
--
-- Verfijning van de source_kind-backfill: playlist-Whisper transcription_jobs die vóór de playlist_id-stempel
-- draaiden hebben een video_url en werden door de heuristiek als 'single' gelabeld. Dat blaast het single-cijfer
-- op met playlist-units (gemeten: 99 van 202). Een job wiens transcript in een playlist-video_results voorkomt,
-- IS een playlist-unit -> reclassificeer naar 'playlist'. (Voorkomt de "single opblazen met gokwerk"-fout, 5c.)
-- LET OP voor het dashboard: deze rijen tellen als playlist-UNIT; niet dubbel tellen met video_results.
UPDATE public.transcription_jobs tj
SET source_kind = 'playlist'
WHERE tj.source_kind = 'single' AND tj.transcript_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.playlist_extraction_jobs p,
                 LATERAL jsonb_each(CASE WHEN jsonb_typeof(p.video_results)='object' THEN p.video_results ELSE '{}'::jsonb END) e
    WHERE (e.value->>'transcript_id') = tj.transcript_id::text
  );
