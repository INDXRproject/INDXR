-- support_tickets: user-facing contact/support form
-- Applied via Supabase MCP apply_migration (never supabase db push / SQL Editor)

CREATE TABLE public.support_tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      text        NOT NULL CHECK (category IN ('feedback', 'billing', 'bug')),
  subject       text        NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body          text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  transcript_id uuid        REFERENCES public.transcripts(id) ON DELETE SET NULL,
  status        text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: users may only SELECT their own rows.
-- INSERT is forbidden directly — use submit_support_ticket() RPC.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin (service role) needs unrestricted access for the admin panel.
-- Service role bypasses RLS by default; no extra policy needed.

-- RPC: submit_support_ticket
-- SECURITY DEFINER + explicit search_path = safe, no search_path injection.
-- Enforces: auth check, input validation, 5-per-hour rate limit, transcript ownership.
CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_category      text,
  p_subject       text,
  p_body          text,
  p_transcript_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_ticket_id uuid;
  v_count     integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_category NOT IN ('feedback', 'billing', 'bug') THEN
    RAISE EXCEPTION 'invalid_category';
  END IF;

  IF char_length(p_subject) < 1 OR char_length(p_subject) > 200 THEN
    RAISE EXCEPTION 'invalid_subject';
  END IF;

  IF char_length(p_body) < 1 OR char_length(p_body) > 5000 THEN
    RAISE EXCEPTION 'invalid_body';
  END IF;

  -- Rate limit: max 5 tickets per user per rolling hour
  SELECT COUNT(*) INTO v_count
  FROM public.support_tickets
  WHERE user_id = v_user_id
    AND created_at > now() - interval '1 hour';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  -- Validate transcript ownership when provided
  IF p_transcript_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.transcripts
      WHERE id = p_transcript_id
        AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'transcript_not_found';
    END IF;
  END IF;

  INSERT INTO public.support_tickets (user_id, category, subject, body, transcript_id)
  VALUES (v_user_id, p_category, p_subject, p_body, p_transcript_id)
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_support_ticket(text, text, text, uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.submit_support_ticket(text, text, text, uuid) TO authenticated;
