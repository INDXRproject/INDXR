-- Migration: messages table + welcome trigger
-- Part of baseline-squash series; second migration after 20260630155944_baseline.sql

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'system',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_user_id ON public.messages (user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read own messages
CREATE POLICY "Users can read own messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark own messages as read (UPDATE only; INSERT is service-role / trigger)
CREATE POLICY "Users can update own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Welcome trigger ───────────────────────────────────────────────────────────
-- Fires AFTER INSERT ON auth.users — separate from handle_new_user (which
-- creates user_credits). Exception-safe: any error is caught and suppressed so
-- a failing INSERT can never block signup.

CREATE OR REPLACE FUNCTION public.handle_new_user_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO public.messages (user_id, title, body, type)
    VALUES (
      NEW.id,
      'Welcome to INDXR',
      E'INDXR extracts transcripts from any YouTube video — captions instantly, AI transcription for videos without them.\n\nTo get started, paste a YouTube URL on the Transcribe page. Your free credits are ready.',
      'welcome'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-critical path; never block signup
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_welcome_message
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_message();
