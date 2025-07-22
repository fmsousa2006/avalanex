/*
  # Add historical data storage to stocks table

  1. New Columns
    - `historical_data` (jsonb) - Store historical price data for all time periods
    - `last_historical_update` (timestamp) - Track when historical data was last updated

  2. Purpose
    - Store 1d, 7d, 30d, 3m, 6m, 1y, 3y, 5y price data from Finnhub
    - Enable real-time chart updates with actual market data
    - Reduce API calls by caching historical data
*/

-- Add historical data columns to stocks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'historical_data'
  ) THEN
    ALTER TABLE stocks ADD COLUMN historical_data jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'last_historical_update'
  ) THEN
    ALTER TABLE stocks ADD COLUMN last_historical_update timestamptz;
  END IF;
END $$;

-- Add index for faster historical data queries
CREATE INDEX IF NOT EXISTS idx_stocks_last_historical_update 
ON stocks (last_historical_update);

-- Add index for historical data JSON queries
CREATE INDEX IF NOT EXISTS idx_stocks_historical_data 
ON stocks USING gin (historical_data);