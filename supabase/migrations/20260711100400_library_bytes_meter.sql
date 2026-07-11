-- Per-user library storage meter (STAP 6). This is the USER's own library footprint
-- (transcripts.user_id) — NOT the shared R2 video-cache (that is a separate aggregate cost, noted
-- in the wiki only). A DB trigger is used because transcripts are inserted from MULTIPLE paths
-- (backend service-role for whisper; the browser client under RLS for captions/edits/RAG) — a trigger
-- is the only O(1), can't-drift way to catch them all without wiring every call site.
--
-- Footprint = octet_length of the text serialization of the content jsonb fields
-- (transcript + edited_content + ai_summary + rag_exports). ai_summary_usage (telemetry) is excluded.
-- Meter only: NO hard block, NO credit-sink UI (post-launch). Cap default is grandfather-safe (5 GiB)
-- so nobody currently near ~80 MB is affected; a per-user cap can later gate "X credits for +MB".
--
-- The trigger UPDATEs user_credits only (never inserts a row) → users with a user_credits row
-- (every signed-up user, via handle_new_user) are tracked; a hypothetical credit-less user is not.

ALTER TABLE public.user_credits
    ADD COLUMN IF NOT EXISTS library_bytes     bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS library_bytes_cap bigint NOT NULL DEFAULT 5368709120; -- 5 GiB

COMMENT ON COLUMN public.user_credits.library_bytes IS
    'Running total of the user''s own transcript library footprint (content jsonb octet_length), maintained by trigger.';
COMMENT ON COLUMN public.user_credits.library_bytes_cap IS
    'Per-user library storage cap (bytes). Meter/foundation only — not enforced yet. Default 5 GiB (grandfather-safe).';

CREATE OR REPLACE FUNCTION public.transcripts_library_bytes_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_old bigint := 0;
    v_new bigint := 0;
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        v_old := COALESCE(octet_length(OLD.transcript::text), 0)
               + COALESCE(octet_length(OLD.edited_content::text), 0)
               + COALESCE(octet_length(OLD.ai_summary::text), 0)
               + COALESCE(octet_length(OLD.rag_exports::text), 0);
    END IF;
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_new := COALESCE(octet_length(NEW.transcript::text), 0)
               + COALESCE(octet_length(NEW.edited_content::text), 0)
               + COALESCE(octet_length(NEW.ai_summary::text), 0)
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
    ELSE  -- UPDATE
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

DROP TRIGGER IF EXISTS transcripts_library_bytes_ins ON public.transcripts;
CREATE TRIGGER transcripts_library_bytes_ins
    AFTER INSERT ON public.transcripts
    FOR EACH ROW EXECUTE FUNCTION public.transcripts_library_bytes_trigger();

DROP TRIGGER IF EXISTS transcripts_library_bytes_del ON public.transcripts;
CREATE TRIGGER transcripts_library_bytes_del
    AFTER DELETE ON public.transcripts
    FOR EACH ROW EXECUTE FUNCTION public.transcripts_library_bytes_trigger();

-- Only fire on content/owner changes (NOT viewed_at bumps on the hot mark-as-read path).
DROP TRIGGER IF EXISTS transcripts_library_bytes_upd ON public.transcripts;
CREATE TRIGGER transcripts_library_bytes_upd
    AFTER UPDATE OF transcript, edited_content, ai_summary, rag_exports, user_id ON public.transcripts
    FOR EACH ROW EXECUTE FUNCTION public.transcripts_library_bytes_trigger();

-- Backfill existing footprints from current transcripts (only touches user_credits rows that have transcripts).
UPDATE public.user_credits uc
SET library_bytes = COALESCE(sub.bytes, 0)
FROM (
    SELECT user_id, SUM(
        COALESCE(octet_length(transcript::text), 0)
        + COALESCE(octet_length(edited_content::text), 0)
        + COALESCE(octet_length(ai_summary::text), 0)
        + COALESCE(octet_length(rag_exports::text), 0)
    ) AS bytes
    FROM public.transcripts
    GROUP BY user_id
) sub
WHERE uc.user_id = sub.user_id;
