-- Library list read surface. Exposes only the light columns the list renders plus
-- cheap presence-booleans, so the list never fetches the heavy `transcript` jsonb.
-- security_invoker = true => the base table's RLS (auth.uid() = user_id) is enforced
-- as the querying user, so no per-user filter is needed here.
CREATE OR REPLACE VIEW public.transcripts_list
WITH (security_invoker = true) AS
SELECT
  id,
  title,
  video_id,
  created_at,
  duration,
  character_count,
  processing_method,
  collection_id,
  viewed_at,
  channel,
  (ai_summary IS NOT NULL)                                   AS has_summary,
  ((ai_summary ->> 'edited_html') IS NOT NULL)              AS has_summary_edit,
  (edited_content IS NOT NULL)                              AS has_edit,
  (COALESCE(
     CASE WHEN jsonb_typeof(rag_exports) = 'array'
          THEN jsonb_array_length(rag_exports) END, 0) > 0) AS has_rag
FROM public.transcripts;

-- Library is authenticated-only; do not expose to anon.
REVOKE ALL ON public.transcripts_list FROM PUBLIC, anon;
GRANT SELECT ON public.transcripts_list TO authenticated;
