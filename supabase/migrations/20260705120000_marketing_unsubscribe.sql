-- Marketing / broadcast opt-out. Deliberately SEPARATE from email_notifications
-- (the support-reply toggle). A marketing unsubscribe must NEVER disable
-- transactional/support email. Default opt-in (false = still subscribed).
-- Set to true by the public token-based unsubscribe route; the broadcast send
-- route skips the EMAIL channel for unsubscribed users but still delivers the
-- in-app message. The existing "Users can update own profile" RLS policy covers
-- this column; the unsubscribe route uses the service-role client (upsert), so
-- users without a profiles row still get one created on unsubscribe.
ALTER TABLE public.profiles
  ADD COLUMN marketing_unsubscribed boolean NOT NULL DEFAULT false;
