/*
  # API Calls Tracking System

  ## Overview
  This migration creates a comprehensive API call tracking system to monitor external API usage,
  particularly Finnhub API calls. The system maintains 90 days of historical data for analytics
  and monitoring purposes.

  ## 1. New Tables
    - `api_calls`
      - `id` (uuid, primary key) - Unique identifier for each API call
      - `created_at` (timestamptz) - Timestamp when the API call was made
      - `service` (text) - API service name (e.g., 'finnhub')
      - `endpoint` (text) - Type of API endpoint called (e.g., 'quote', 'candles', 'historical')
      - `symbol` (text) - Stock symbol that was queried (e.g., 'AAPL', 'GOOGL')
      - `status` (text) - Result status ('success', 'error', 'no_data')
      - `user_id` (uuid, nullable) - Optional user identifier for multi-user tracking
      - `response_time_ms` (integer, nullable) - API response time in milliseconds

  ## 2. Indexes
    - `idx_api_calls_created_at` - For efficient date-based queries (today's count, date ranges)
    - `idx_api_calls_service` - For filtering by API service
    - `idx_api_calls_symbol` - For analyzing most frequently queried stocks
    - `idx_api_calls_user_id` - For per-user analytics

  ## 3. Security
    - Enable RLS on `api_calls` table
    - Policy: Only authenticated users can read API call logs
    - Policy: System can insert API call logs (no user restriction on insert)

  ## 4. Automatic Cleanup
    - Function: `cleanup_old_api_calls()` - Deletes records older than 90 days
    - Trigger: Runs daily via pg_cron extension
    - Purpose: Prevent unlimited database growth while maintaining useful historical data

  ## 5. Usage Analytics
    This table enables:
    - Real-time monitoring of today's API usage
    - Historical trend analysis (daily/weekly/monthly patterns)
    - Identification of most-queried stocks
    - API error rate tracking
    - User-level usage patterns (if user_id is tracked)
    - Response time monitoring for performance analysis

  ## 6. Future Knowledge Base
    **For developers maintaining this system:**
    - The `created_at` field is automatically set to current timestamp
    - Records older than 90 days are automatically deleted daily
    - To query today's API calls: `WHERE created_at >= CURRENT_DATE`
    - To disable cleanup: Remove the pg_cron job
    - To change retention period: Modify the interval in `cleanup_old_api_calls()` function
*/

-- Create api_calls table
CREATE TABLE IF NOT EXISTS api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  service text NOT NULL,
  endpoint text NOT NULL,
  symbol text,
  status text NOT NULL DEFAULT 'success',
  user_id uuid,
  response_time_ms integer,
  CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'no_data'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_calls_created_at ON api_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_service ON api_calls(service);
CREATE INDEX IF NOT EXISTS idx_api_calls_symbol ON api_calls(symbol);
CREATE INDEX IF NOT EXISTS idx_api_calls_user_id ON api_calls(user_id);

-- Enable Row Level Security
ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read API call logs
CREATE POLICY "Authenticated users can view API call logs"
  ON api_calls
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow system to insert API call logs (no user restriction)
CREATE POLICY "System can insert API call logs"
  ON api_calls
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to cleanup old API calls (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_calls()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM api_calls
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleaned up API calls older than 90 days';
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
-- Note: pg_cron job names must be unique
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('cleanup-old-api-calls');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule the cleanup job
SELECT cron.schedule(
  'cleanup-old-api-calls',
  '0 2 * * *', -- Every day at 2 AM UTC
  'SELECT cleanup_old_api_calls();'
);

-- Add comment for documentation
COMMENT ON TABLE api_calls IS 'Tracks all external API calls for monitoring and analytics. Records are automatically deleted after 90 days.';
COMMENT ON FUNCTION cleanup_old_api_calls IS 'Deletes API call records older than 90 days. Scheduled to run daily at 2 AM UTC via pg_cron.';