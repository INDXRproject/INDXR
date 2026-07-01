-- Add sender_role to messages: distinguishes user-sent replies from admin-sent messages.
-- Existing rows (all inserted by service-role / trigger) get DEFAULT 'admin'.
ALTER TABLE public.messages
  ADD COLUMN sender_role text NOT NULL DEFAULT 'admin'
  CHECK (sender_role IN ('admin', 'user'));
