-- Editable AI summary (herbouw): een APARTE kolom voor de bewerkte samenvatting, zodat opnieuw
-- genereren (overschrijft ai_summary) de bewerking NIET vernietigt. Spiegelt exact het transcript-
-- patroon (edited_content / edited_content_updated_at). Het oude ontwerp bewaarde de bewerking inline
-- in ai_summary.edited_html — dat kon een regeneratie niet overleven; vandaar de aparte kolom.

ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS ai_summary_edited jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary_edited_updated_at timestamptz;

-- Opslagmeter: tel de bewerkte samenvatting mee (zoals transcript/edited_content/ai_summary/rag_exports).
-- Bestaande rijen hebben ai_summary_edited = NULL → octet_length NULL → 0, dus library_bytes blijft
-- ongewijzigd tot een gebruiker een samenvatting bewerkt (geen backfill nodig).
CREATE OR REPLACE FUNCTION public.transcripts_library_bytes_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old bigint := 0;
    v_new bigint := 0;
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        v_old := COALESCE(octet_length(OLD.transcript::text), 0)
               + COALESCE(octet_length(OLD.edited_content::text), 0)
               + COALESCE(octet_length(OLD.ai_summary::text), 0)
               + COALESCE(octet_length(OLD.ai_summary_edited::text), 0)
               + COALESCE(octet_length(OLD.rag_exports::text), 0);
    END IF;
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_new := COALESCE(octet_length(NEW.transcript::text), 0)
               + COALESCE(octet_length(NEW.edited_content::text), 0)
               + COALESCE(octet_length(NEW.ai_summary::text), 0)
               + COALESCE(octet_length(NEW.ai_summary_edited::text), 0)
               + COALESCE(octet_length(NEW.rag_exports::text), 0);
    END IF;

    IF (TG_OP = 'INSERT') THEN
        UPDATE public.user_credits
        SET library_bytes = GREATEST(0, library_bytes + v_new)
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.user_credits
        SET library_bytes = GREATEST(0, library_bytes - v_old)
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    ELSE
        IF (NEW.user_id = OLD.user_id) THEN
            UPDATE public.user_credits
            SET library_bytes = GREATEST(0, library_bytes + (v_new - v_old))
            WHERE user_id = NEW.user_id;
        ELSE
            UPDATE public.user_credits
            SET library_bytes = GREATEST(0, library_bytes - v_old)
            WHERE user_id = OLD.user_id;
            UPDATE public.user_credits
            SET library_bytes = GREATEST(0, library_bytes + v_new)
            WHERE user_id = NEW.user_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

-- De UPDATE-trigger is kolom-gescoped: voeg ai_summary_edited toe zodat een edit-only-UPDATE 'm afvuurt.
DROP TRIGGER IF EXISTS transcripts_library_bytes_upd ON public.transcripts;
CREATE TRIGGER transcripts_library_bytes_upd
  AFTER UPDATE OF transcript, edited_content, ai_summary, ai_summary_edited, rag_exports, user_id
  ON public.transcripts FOR EACH ROW EXECUTE FUNCTION public.transcripts_library_bytes_trigger();

-- Bibliotheek-badge: has_summary_edit leest nu de aparte kolom (was ai_summary->>'edited_html', dood).
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
        END, 0) > 0 AS has_rag
   FROM public.transcripts;
