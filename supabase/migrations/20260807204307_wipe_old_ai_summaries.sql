-- ADR-090: het samenvatting-schema wijzigt volledig ({text,action_points,edited_html} → overview+sections).
-- Geen legacy-reader en geen backfill: de oude payloads (incl. de geneste edited_html) worden hard gewist.
-- Elk bestaand transcript rendert daarna als "geen samenvatting" (de nieuwe reader-lege-staat). Vóór launch;
-- één niet-intern account met 2 transcripten is bekend/akkoord, de rest is interne testdata.
UPDATE public.transcripts SET ai_summary = NULL WHERE ai_summary IS NOT NULL;
