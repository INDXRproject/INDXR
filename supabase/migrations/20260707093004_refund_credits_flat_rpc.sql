-- ADR-050 crash-recovery-hardening: idempotente vlakke refund voor het OUDE-modus-pad in de
-- watchdog (Pass 2, credits_reserved=0). add_credits is NIET idempotent; de fix draait de
-- volgorde om naar refund-vóór-terminal-claim, en dat vereist een idempotente refund zodat een
-- retry (na een 522) nooit dubbel terugboekt. Mirror van refund_credits, maar voor een
-- caller-opgegeven vlak bedrag (het gededucte credits_cost). Idempotent via de bestaande
-- partiële UNIQUE credit_transactions_job_kind_uidx op (job_id, kind) WHERE job_id IS NOT NULL.
CREATE OR REPLACE FUNCTION public.refund_credits_flat(
  p_user_id uuid,
  p_job_id uuid,
  p_amount integer,
  p_reason text
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'noop', true);
  END IF;

  -- Balans-rij garanderen + locken (parity met refund_credits).
  INSERT INTO public.user_credits (user_id, credits) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  -- Idempotentie-insert eerst (partiële UNIQUE op (job_id,'refund')). Al gerefund => niets doen.
  INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, metadata)
  VALUES (p_user_id, p_amount, 'credit', 'refund', p_reason, p_job_id,
          jsonb_build_object('watchdog', true))
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_row_id;

  IF v_row_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  -- Balans pas ná de idempotentie-check, zodat een retry niet dubbel muteert.
  UPDATE public.user_credits SET credits = credits + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'refunded', p_amount);
END;
$function$;
