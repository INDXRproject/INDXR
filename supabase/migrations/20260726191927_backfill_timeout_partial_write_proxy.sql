-- Toegepast via Supabase MCP apply_migration (version 20260726191927) — repo-sync.
--
-- Vervolg op de timeout-split: de 2 resterende 'timeout'-rijen bleken bij inspectie óók mislabeld
-- (0 van 4 was een echte timeout). Eenduidig, dus backfill:
--   "bytes read / more expected"       -> partial_write (afgebroken download)
--   "tunnel connection failed" / proxy -> proxy_error (proxy checkt nu vóór timeout in de classifier)
UPDATE public.transcription_jobs SET error_type='partial_write'
WHERE error_type='timeout' AND error_message ~* '(bytes read|more expected|incomplete read)';

UPDATE public.transcription_jobs SET error_type='proxy_error'
WHERE error_type='timeout' AND error_message ~* '(tunnel connection failed|unable to connect to proxy|proxyerror|407 proxy)';
