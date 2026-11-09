-- Gevonden 9-11 (A2): search_library (MCP) en de bibliotheekzoeker (app) retourneerden treffers in
-- willekeurige volgorde (geen ORDER BY vóór LIMIT) — "Napoleon" gaf 5 treffers uit HIST 210/Kagan
-- terwijl HIST 202 er 13 heeft. Eén SQL-RPC, door beide gebruikt: titeltreffers eerst, daarna
-- ts_rank op search_tsv. SECURITY INVOKER (zelfde model als transcripts_list): de RLS-policy op
-- transcripts (user_id = auth.uid()) is de echte grens voor de 'authenticated'-rol; p_user_id is
-- alleen nodig zodat de MCP-backend (service_role, buiten RLS) zijn al-geverifieerde user_id kan
-- doorgeven — exact hetzelfde vertrouwensmodel als de bestaande .eq("user_id", user_id)-calls in
-- backend/mcp_server.py. Zonder zoekopdracht (p_query leeg) blijft het bestaande sort-gedrag
-- (date/duration/title) ongewijzigd — relevantie-ranking geldt alleen wanneer er iets gezocht wordt.

CREATE OR REPLACE FUNCTION public.search_transcripts_ranked(
    p_user_id uuid,
    p_query text DEFAULT NULL,
    p_collection_id uuid DEFAULT NULL,
    p_unread_only boolean DEFAULT false,
    p_source text DEFAULT NULL,            -- 'captions' | 'ai' | NULL
    p_has_summary boolean DEFAULT NULL,
    p_has_edit boolean DEFAULT NULL,
    p_has_rag boolean DEFAULT NULL,
    p_duration_min integer DEFAULT NULL,
    p_duration_max integer DEFAULT NULL,
    p_added_after timestamptz DEFAULT NULL,
    p_sort text DEFAULT 'date',            -- 'date' | 'duration' | 'title' — ignored when p_query is set
    p_sort_asc boolean DEFAULT false,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    video_id text,
    created_at timestamptz,
    duration integer,
    character_count integer,
    processing_method text,
    collection_id uuid,
    viewed_at timestamptz,
    channel text,
    has_summary boolean,
    has_summary_edit boolean,
    has_edit boolean,
    has_rag boolean,
    total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public', 'pg_temp'
AS $function$
    WITH tokens AS (
        SELECT t AS tok,
               -- Port of ftsPrefixQuery (packages/shared/.../filters.ts) / _fts_prefix_query
               -- (backend/mcp_server.py): split on non-alphanumeric, join as prefix-tsquery.
               NULLIF(
                   array_to_string(
                       ARRAY(
                           SELECT lower(p) || ':*'
                           FROM regexp_split_to_table(t, '[^[:alnum:]]+') AS p
                           WHERE p <> ''
                       ),
                       ' & '
                   ),
                   ''
               ) AS fts
        FROM regexp_split_to_table(
                 trim(regexp_replace(COALESCE(p_query, ''), '[%,()]', ' ', 'g')), '\s+'
             ) AS t
        WHERE t <> ''
        LIMIT 6
    ),
    combined AS (
        SELECT
            CASE WHEN string_agg(fts, ' & ') FILTER (WHERE fts IS NOT NULL) IS NOT NULL
                 THEN to_tsquery('simple', string_agg(fts, ' & ') FILTER (WHERE fts IS NOT NULL))
            END AS tsq
        FROM tokens
    ),
    base AS (
        SELECT tr.id, tr.title, tr.video_id, tr.created_at, tr.duration, tr.character_count,
               tr.processing_method, tr.collection_id, tr.viewed_at, tr.channel,
               tr.ai_summary IS NOT NULL AS has_summary,
               tr.ai_summary_edited IS NOT NULL AS has_summary_edit,
               tr.edited_content IS NOT NULL AS has_edit,
               COALESCE(
                   CASE WHEN jsonb_typeof(tr.rag_exports) = 'array'
                        THEN jsonb_array_length(tr.rag_exports) END, 0) > 0 AS has_rag,
               tr.search_tsv,
               -- "titeltreffer" wanneer minstens één token in de titel voorkomt.
               EXISTS (SELECT 1 FROM tokens WHERE tr.title ILIKE '%' || tok || '%') AS title_hit
        FROM public.transcripts tr
        WHERE tr.user_id = p_user_id
          AND (p_collection_id IS NULL OR tr.collection_id = p_collection_id)
          AND (NOT p_unread_only OR tr.viewed_at IS NULL)
          AND (p_source IS NULL
               OR (p_source = 'captions' AND tr.processing_method = 'youtube_captions')
               OR (p_source = 'ai' AND tr.processing_method = 'assemblyai'))
          AND (p_has_summary IS NULL OR (tr.ai_summary IS NOT NULL) = p_has_summary)
          AND (p_has_edit IS NULL OR (tr.edited_content IS NOT NULL) = p_has_edit)
          AND (p_has_rag IS NULL OR (COALESCE(
                   CASE WHEN jsonb_typeof(tr.rag_exports) = 'array'
                        THEN jsonb_array_length(tr.rag_exports) END, 0) > 0) = p_has_rag)
          AND (p_duration_min IS NULL OR tr.duration >= p_duration_min)
          AND (p_duration_max IS NULL OR tr.duration < p_duration_max)
          AND (p_added_after IS NULL OR tr.created_at >= p_added_after)
          -- Elk zoektoken moet matchen (titel/kanaal/video_id ILIKE, of search_tsv) — een token
          -- zonder doorzoekbare inhoud (zuiver leestekens) wordt overgeslagen, net als in de
          -- bestaande Python/TS-implementaties (if not fts: continue).
          AND NOT EXISTS (
              SELECT 1 FROM tokens
              WHERE fts IS NOT NULL
                AND NOT (
                    tr.title ILIKE '%' || tok || '%'
                    OR tr.channel ILIKE '%' || tok || '%'
                    OR tr.video_id ILIKE '%' || tok || '%'
                    OR tr.search_tsv @@ to_tsquery('simple', fts)
                )
          )
    )
    SELECT b.id, b.title, b.video_id, b.created_at, b.duration, b.character_count,
           b.processing_method, b.collection_id, b.viewed_at, b.channel,
           b.has_summary, b.has_summary_edit, b.has_edit, b.has_rag,
           count(*) OVER () AS total_count
    FROM base b, combined c
    ORDER BY
        CASE WHEN p_query IS NOT NULL AND trim(p_query) <> '' THEN b.title_hit END DESC NULLS LAST,
        CASE WHEN p_query IS NOT NULL AND trim(p_query) <> '' AND c.tsq IS NOT NULL
             THEN ts_rank(b.search_tsv, c.tsq) END DESC NULLS LAST,
        CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN
            CASE WHEN p_sort = 'duration' AND p_sort_asc THEN b.duration END END ASC NULLS LAST,
        CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN
            CASE WHEN p_sort = 'duration' AND NOT p_sort_asc THEN b.duration END END DESC NULLS LAST,
        CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN
            CASE WHEN p_sort = 'title' AND p_sort_asc THEN b.title END END ASC NULLS LAST,
        CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN
            CASE WHEN p_sort = 'title' AND NOT p_sort_asc THEN b.title END END DESC NULLS LAST,
        CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN
            CASE WHEN p_sort_asc THEN b.created_at END END ASC NULLS LAST,
        b.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$function$;

COMMENT ON FUNCTION public.search_transcripts_ranked IS
    'Gedeelde ranked-search RPC voor de bibliotheek (app) en search_library (MCP, ADR-108) — '
    'titeltreffers eerst, daarna ts_rank(search_tsv). SECURITY INVOKER: RLS op transcripts blijft '
    'de echte grens voor authenticated-callers; p_user_id laat de MCP-backend (service_role) zijn '
    'al-geverifieerde user_id doorgeven.';

GRANT EXECUTE ON FUNCTION public.search_transcripts_ranked TO authenticated, service_role;
