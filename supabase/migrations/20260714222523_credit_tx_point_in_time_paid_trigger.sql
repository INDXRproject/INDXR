-- B2 — point-in-time paid/internal snapshot op ELKE credit-debit (ai_transcription/ai_summary/rag/caption).
-- Mirror van usage_logs.had_paid_at_time/is_internal_at_time, maar dan voor credit_transactions.
-- Aanpak = BEFORE INSERT-trigger: één trigger dekt alle vier debit-paden uniform, raakt GEEN
-- gelockte financiële RPC (settle_credits / deduct_credits_atomic / update_playlist_video_progress)
-- in signature of body. Additieve nullable kolommen; historische rijen blijven NULL (geen backfill).

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS had_paid_at_time  boolean,
  ADD COLUMN IF NOT EXISTS is_internal_at_time boolean;

COMMENT ON COLUMN public.credit_transactions.had_paid_at_time IS
  'Snapshot bij debit: had deze user >=1 aankoop (credit met stripe_session_id) op besteed-moment. NULL op historische rijen + op credits.';
COMMENT ON COLUMN public.credit_transactions.is_internal_at_time IS
  'Snapshot bij debit: was de user intern/test op besteed-moment. NULL op historische rijen + op credits.';

-- Hot-path-index: de EXISTS-check draait per debit-insert op het financiële pad.
-- (user_id, type) → index-scan op de credit-rijen van de user, geen seq scan.
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type
  ON public.credit_transactions (user_id, type);

CREATE OR REPLACE FUNCTION public.stamp_credit_debit_point_in_time()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  -- Alleen bestedingen krijgen de point-in-time stempel; credits (aankoop/grant/refund) niet.
  IF NEW.type = 'debit' THEN
    IF NEW.had_paid_at_time IS NULL THEN
      NEW.had_paid_at_time := EXISTS (
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = NEW.user_id
          AND ct.type = 'credit'
          AND ct.metadata ? 'stripe_session_id'
      );
    END IF;
    IF NEW.is_internal_at_time IS NULL THEN
      SELECT p.is_internal INTO NEW.is_internal_at_time
      FROM public.profiles p WHERE p.id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_stamp_credit_debit_point_in_time ON public.credit_transactions;
CREATE TRIGGER trg_stamp_credit_debit_point_in_time
  BEFORE INSERT ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_credit_debit_point_in_time();

-- ACL: trigger-functie is SECURITY DEFINER → niet aanroepbaar door anon/authenticated buiten de trigger.
REVOKE ALL ON FUNCTION public.stamp_credit_debit_point_in_time() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.stamp_credit_debit_point_in_time() FROM anon, authenticated;
