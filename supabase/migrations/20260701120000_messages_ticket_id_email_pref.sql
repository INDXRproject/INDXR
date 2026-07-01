-- Add ticket_id to messages: NULL = inbox/system, non-NULL = admin reply on a ticket
-- ON DELETE CASCADE: when a ticket is deleted, its reply messages go too
ALTER TABLE public.messages
  ADD COLUMN ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE;

-- Add email_notifications preference to profiles (default opt-in)
-- The existing "Users can update own profile" RLS policy covers this column.
ALTER TABLE public.profiles
  ADD COLUMN email_notifications boolean NOT NULL DEFAULT true;
