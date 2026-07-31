-- Toegepast via Supabase MCP apply_migration (version 20260731142539) — repo-sync.
-- Worker-slot-saturatie (uit de Operations-mockup): de worker-concurrency-cap (ARQ max_jobs, nu
-- expliciet 10 in worker.WorkerSettings) als config, zodat de dashboard-gauge tegen een echt getal
-- meet. Spiegelt WorkerSettings.max_jobs — wijzig ze samen.
INSERT INTO public.ops_config (key, value)
VALUES ('worker_concurrency_limit', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
