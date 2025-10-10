/*
  # Add 365-day retention policy for 1h resolution price data

  1. New Function
    - `cleanup_old_hourly_prices()` - Deletes 1h resolution records older than 365 days
    - Only affects 1h partition data
    - Leaves 1d and 30d data untouched (indefinite retention)

  2. Cron Job
    - Schedule: Daily at 3 AM UTC
    - Runs after the api_calls cleanup (which runs at 2 AM)
    - Automatically maintains 1-year rolling window of hourly data

  3. Purpose
    - Keeps database size manageable on free tier
    - Maintains 1 year of intraday price history
    - Daily and aggregated data retained indefinitely for long-term analysis

  4. Notes
    - 365 days of hourly data = sufficient for most technical analysis
    - Daily data remains for multi-year charting
    - Can be adjusted by modifying the interval in the function
*/

-- Create function to cleanup old hourly price data (older than 365 days)
CREATE OR REPLACE FUNCTION cleanup_old_hourly_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM stock_prices
  WHERE resolution = '1h'
    AND timestamp < NOW() - INTERVAL '365 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % hourly price records older than 365 days', deleted_count;
END;
$$;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-old-hourly-prices',
  '0 3 * * *',
  'SELECT cleanup_old_hourly_prices();'
);

-- Add helpful comments
COMMENT ON FUNCTION cleanup_old_hourly_prices IS 'Deletes 1h resolution price records older than 365 days. Scheduled to run daily at 3 AM UTC via pg_cron. Does not affect 1d or 30d data.';
