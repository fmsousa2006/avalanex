/*
  # Setup daily price sync cron job

  1. Create Function
    - `call_sync_daily_prices()` - Wrapper function to invoke the sync-daily-prices edge function
    - Calls the edge function using Supabase's http extension

  2. Cron Job
    - Schedule: Daily at 5:00 PM EST (after market closes at 4:00 PM)
    - Runs Monday-Friday only
    - Cron expression: '0 21 * * 1-5' (21:00 UTC = 5:00 PM EST, accounting for daylight saving time adjustments)
    
  3. Purpose
    - Automatically capture end-of-day stock prices
    - Populate the 1d resolution partition in stock_prices table
    - Enable daily/weekly/monthly chart views
*/

-- Create function to call the sync-daily-prices edge function
CREATE OR REPLACE FUNCTION call_sync_daily_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://szhhlldwpfpysbvgzcwt.supabase.co/functions/v1/sync-daily-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aGhsbGR3cGZweXNidmd6Y3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTcwOTcsImV4cCI6MjA2ODU5MzA5N30.F9rUYOihlcuRabDfDl51c0P1Um6VFnSpzg_CM4Xvepg'
    ),
    body := '{}'::jsonb
  ) INTO request_id;
END;
$$;

-- Schedule daily price sync at 5 PM EST (9 PM UTC) on weekdays
SELECT cron.schedule(
  'daily-price-sync',
  '0 21 * * 1-5',
  'SELECT call_sync_daily_prices();'
);
