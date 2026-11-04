-- Bibliotheek: zoeken in de transcripttekst zelf, niet alleen titel/kanaal/video_id
-- (docs/wiki/roadmap/product-gaps-2026-11-04.md, gat 1).
--
-- search_tsv = tsvector over de segmentteksten (transcript: [{text, offset, duration}]) plus alle
-- `text`-velden van edited_content (Tiptap-JSON). Keuzes:
--  * 'simple'-config: transcripten zijn in veel talen; geen per-taal-stemming. De frontend zoekt
--    met prefix (woord:*), dat vangt meervouden/vervoegingen grotendeels.
--  * strip(): geen posities -> vector = unieke woorden. (Prijs: geen frase-zoeken.)
--  * De 1 MB-limiet geldt al voor de TUSSENvector mét posities: to_tsvector op een heel lang
--    transcript in één keer gooit "string is too long for tsvector" en zou de INSERT van het
--    transcript laten falen (lokaal gereproduceerd). Daarom bouwt transcript_search_tsv() de vector
--    in brokken van ~100k tekens (op een spatie geknipt), stript elk brok en voegt ze samen. Het
--    vangnet (EXCEPTION) geeft de tot dan opgebouwde vector terug: een transcript-INSERT mag
--    hier nooit op stuklopen.
--  * lax $.**.text kan dubbelen opleveren -- onschadelijk in een tsvector.

CREATE OR REPLACE FUNCTION public.transcript_search_tsv(t jsonb, e jsonb)
RETURNS tsvector
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  txt text := coalesce(jsonb_path_query_array(t, '$[*].text')::text, '') || ' ' ||
              coalesce(jsonb_path_query_array(e, '$.**.text')::text, '');
  len int := length(txt);
  v tsvector := ''::tsvector;
  i int := 1;
  j int;
  sp int;
BEGIN
  WHILE i <= len LOOP
    j := i + 100000;
    IF j <= len THEN
      sp := strpos(substr(txt, j, 200), ' ');
      IF sp > 0 THEN j := j + sp; END IF;
    END IF;
    v := v || strip(to_tsvector('simple'::regconfig, substr(txt, i, j - i)));
    i := j;
  END LOOP;
  RETURN v;
EXCEPTION WHEN others THEN
  RETURN v;
END;
$$;

ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (public.transcript_search_tsv(transcript, edited_content)) STORED;

CREATE INDEX IF NOT EXISTS transcripts_search_tsv_idx
  ON public.transcripts USING gin (search_tsv);

-- View: zelfde kolommen in dezelfde volgorde, search_tsv achteraan (CREATE OR REPLACE VIEW mag
-- alleen kolommen toevoegen aan het eind). security_invoker blijft -> RLS van transcripts geldt.
CREATE OR REPLACE VIEW public.transcripts_list WITH (security_invoker = true) AS
 SELECT id,
    title,
    video_id,
    created_at,
    duration,
    character_count,
    processing_method,
    collection_id,
    viewed_at,
    channel,
    ai_summary IS NOT NULL AS has_summary,
    ai_summary_edited IS NOT NULL AS has_summary_edit,
    edited_content IS NOT NULL AS has_edit,
    COALESCE(
        CASE
            WHEN jsonb_typeof(rag_exports) = 'array'::text THEN jsonb_array_length(rag_exports)
            ELSE NULL::integer
        END, 0) > 0 AS has_rag,
    search_tsv
   FROM public.transcripts;
