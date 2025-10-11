/*
  # Fix Market Hours Cron Schedule

  Update the cron job schedules to properly align with US market hours:
  
  1. Hourly sync (jobid 2): Changed from 9-16 UTC to 14-20 UTC
     - Covers market hours during both EST and EDT
     - 14:00-20:00 UTC = 9 AM-4 PM EST or 10 AM-4 PM EDT
  
  2. Daily sync (jobid 3): Changed from 21:00 UTC to 20:30 UTC
     - Runs at 4:30 PM EST / 3:30 PM EDT (30 min after market close)
     - Gives time for all end-of-day data to be finalized
  
  This ensures price data is collected during actual trading hours and daily 
  summaries are generated shortly after market close at 4 PM EST/EDT (20:00 or 21:00 UTC).
*/

-- Update hourly market data sync to run during actual market hours (14-20 UTC)
SELECT cron.alter_job(
  2,
  schedule := '0 14-20 * * 1-5'
);

-- Update daily price sync to run at 8:30 PM UTC (30 min after market close during EDT)
SELECT cron.alter_job(
  3,
  schedule := '30 20 * * 1-5'
);
