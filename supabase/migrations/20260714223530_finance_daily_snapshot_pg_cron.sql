-- B1-scheduler = pg_cron (DB-native → overleeft worker-deploys/-restarts; snapshot-logica is pure SQL).
-- 02:00 UTC ligt veilig na Amsterdam-middernacht (zowel CET +01 als CEST +02). De functie zelf
-- bepaalt DST-correct "gisteren Amsterdam", dus de vaste UTC-cron is DST-veilig.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finance-daily-snapshot') THEN
    PERFORM cron.unschedule('finance-daily-snapshot');
  END IF;
  PERFORM cron.schedule('finance-daily-snapshot', '0 2 * * *', 'SELECT public.snapshot_finance_day();');
END $$;
