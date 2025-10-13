/*
  # Fix Market Sync Schedule to Include Half Hours

  ## Problem
  The market opens at 9:30 AM EDT (13:30 UTC) but the cron job only runs on the hour
  starting at 14:00 UTC (10:00 AM EDT), missing the first 30 minutes of trading.

  ## Solution
  Update the hourly sync schedule to run at both :00 and :30 minutes past each hour
  during market hours (13:30-20:00 UTC covers 9:30 AM - 4:00 PM EDT).

  ## Changes
  - Old schedule: '0 14-20 * * 1-5' (runs at minute 0 of hours 14-20 UTC)
  - New schedule: '0,30 13-20 * * 1-5' (runs at minutes 0 and 30 of hours 13-20 UTC)

  ## Result
  - First run: 13:30 UTC (9:30 AM EDT) - market open
  - Subsequent runs: every 30 minutes during market hours
  - Last run: 20:00 UTC (4:00 PM EDT) - market close
*/

-- Update hourly market data sync to run every 30 minutes starting at market open
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'hourly-market-data-sync'),
  schedule := '0,30 13-20 * * 1-5'
);