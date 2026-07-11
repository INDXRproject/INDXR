-- daily_cost_counters: lightweight day-grain aggregate for cost inputs that must NOT get a
-- per-event row. The free caption route is anonymous + high-volume; a per-extraction cost row
-- (usage_logs currently has NO backend writers) would be heavy. Instead each caption download
-- adds its proxy bytes into today's single row via bump_caption_proxy_bytes (O(1) upsert).
-- Service-role only (RLS on, no policies). Extend with more columns later if needed.

CREATE TABLE IF NOT EXISTS public.daily_cost_counters (
    day                  date PRIMARY KEY,
    caption_proxy_bytes  bigint NOT NULL DEFAULT 0,
    caption_count        integer NOT NULL DEFAULT 0,
    updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.daily_cost_counters IS
    'Day-grain aggregate cost counters (no per-event rows). caption_proxy_bytes = summed Decodo egress of the free caption route.';

ALTER TABLE public.daily_cost_counters ENABLE ROW LEVEL SECURITY;
-- No policies → service_role only.

CREATE OR REPLACE FUNCTION public.bump_caption_proxy_bytes(p_bytes bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.daily_cost_counters (day, caption_proxy_bytes, caption_count)
    VALUES (CURRENT_DATE, GREATEST(COALESCE(p_bytes, 0), 0), 1)
    ON CONFLICT (day) DO UPDATE SET
        caption_proxy_bytes = public.daily_cost_counters.caption_proxy_bytes + GREATEST(COALESCE(p_bytes, 0), 0),
        caption_count       = public.daily_cost_counters.caption_count + 1,
        updated_at          = now();
END;
$function$;

COMMENT ON FUNCTION public.bump_caption_proxy_bytes(bigint) IS
    'Add one free-caption download''s Decodo egress bytes into today''s daily_cost_counters row (O(1) upsert). Service-role.';
