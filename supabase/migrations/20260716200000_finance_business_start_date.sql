-- F13: business start date, config-driven (not hardcoded in the tsx). Drives the "All time" preset lower bound
-- and the datepicker floor — the picker won't step before this date. 2026-01-01 = first month of operations.
INSERT INTO public.finance_settings (key, value)
VALUES ('business_start_date', '"2026-01-01"'::jsonb)
ON CONFLICT (key) DO NOTHING;
