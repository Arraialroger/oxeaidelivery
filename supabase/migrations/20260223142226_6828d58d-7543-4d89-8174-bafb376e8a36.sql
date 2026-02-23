
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule reconcile-payments every 5 minutes
SELECT cron.schedule(
  'reconcile-payments-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xcogccusyerkvoimfxeb.supabase.co/functions/v1/reconcile-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REPLACE_WITH_CRON_SECRET_KEY"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);

-- Schedule cleanup of old reconciliation_runs every Sunday at 3AM UTC
SELECT cron.schedule(
  'cleanup-reconciliation-runs-90d',
  '0 3 * * 0',
  $$
  DELETE FROM public.reconciliation_runs
  WHERE executed_at < NOW() - INTERVAL '90 days';
  $$
);
