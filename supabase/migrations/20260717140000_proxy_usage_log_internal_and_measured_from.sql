-- Point 4: test/non-customer proxy egress must stay out of the real (external) economy — same idea as
-- profiles.is_internal. The account-level reconciliation still counts it (Decodo billed it over their line),
-- but the external proxy-overhead OPEX line will exclude it (see admin_finance_summary / snapshot_finance_day).
ALTER TABLE public.proxy_usage_log ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Point 3: the day our proxy MEASUREMENT began (transcription_jobs.proxy_bytes capture, ADR-054). Days before
-- this have Decodo-billed traffic but no measurement → billed IS the cost (no gap possible), not a 100% gap.
INSERT INTO public.finance_settings (key, value)
VALUES ('proxy_measured_from', '"2026-07-11"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- The delay-test download (81abb35) was real proxy usage but a test, not customer traffic → mark internal.
UPDATE public.proxy_usage_log SET is_internal = true WHERE category = 'delay_test';
