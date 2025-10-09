/*
  # Setup Hourly Market Data Sync

  1. Creates
    - pg_cron job that calls the sync-market-data Edge Function every hour during market hours
    - Helper function to invoke the Edge Function via HTTP

  2. Schedule
    - Runs every hour from 9:00 AM to 4:00 PM EST (market hours)
    - Monday through Friday only
    - Cron expression: 0 9-16 * * 1-5 (every hour from 9 AM to 4 PM, Mon-Fri)

  3. Notes
    - Uses pg_net extension to make HTTP requests
    - Edge Function handles market hours check internally
    - Service role key needed for authenticated requests
*/

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call the sync Edge Function
CREATE OR REPLACE FUNCTION call_sync_market_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  service_role_key text;
BEGIN
  -- Get service role key from vault (you'll need to set this up)
  -- For now, we'll use a placeholder approach
  
  SELECT net.http_post(
    url := 'https://szhhlldwpfpysbvgzcwt.supabase.co/functions/v1/sync-market-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aGhsbGR3cGZweXNidmd6Y3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTcwOTcsImV4cCI6MjA2ODU5MzA5N30.F9rUYOihlcuRabDfDl51c0P1Um6VFnSpzg_CM4Xvepg'
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  
  -- Log the request
  RAISE NOTICE 'Sync market data request initiated: %', request_id;
END;
$$;

-- Schedule the cron job to run every hour during market hours
-- Cron format: minute hour day month weekday
-- 0 9-16 * * 1-5 = Every hour from 9 AM to 4 PM, Monday to Friday
SELECT cron.schedule(
  'hourly-market-data-sync',
  '0 9-16 * * 1-5',
  'SELECT call_sync_market_data();'
);