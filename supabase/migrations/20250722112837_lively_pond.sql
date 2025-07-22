/*
  # Add Real-Time Stock Price Tracking

  1. Database Changes
    - Add `current_price` column to stocks table for real-time price data
    - Add `last_price_update` column to track when price was last fetched
    - Add `price_change_24h` and `price_change_percent_24h` for daily changes
    - Add `market_status` to track if market is open/closed
    - Add indexes for efficient price queries

  2. New Features
    - Support for real-time stock price fetching
    - Track price update timestamps
    - Store daily price changes
    - Market status tracking
*/

-- Add new columns to stocks table for real-time price data
DO $$
BEGIN
  -- Add current_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'current_price'
  ) THEN
    ALTER TABLE stocks ADD COLUMN current_price NUMERIC(10,2) DEFAULT 0;
  END IF;

  -- Add last_price_update column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'last_price_update'
  ) THEN
    ALTER TABLE stocks ADD COLUMN last_price_update TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- Add price_change_24h column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'price_change_24h'
  ) THEN
    ALTER TABLE stocks ADD COLUMN price_change_24h NUMERIC(10,2) DEFAULT 0;
  END IF;

  -- Add price_change_percent_24h column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'price_change_percent_24h'
  ) THEN
    ALTER TABLE stocks ADD COLUMN price_change_percent_24h NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Add market_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'market_status'
  ) THEN
    ALTER TABLE stocks ADD COLUMN market_status TEXT DEFAULT 'closed';
  END IF;

  -- Add is_active column to track which stocks we want to monitor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE stocks ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add constraint for market_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stocks_market_status_check'
  ) THEN
    ALTER TABLE stocks ADD CONSTRAINT stocks_market_status_check 
    CHECK (market_status IN ('open', 'closed', 'pre_market', 'after_hours'));
  END IF;
END $$;

-- Create indexes for efficient price queries
CREATE INDEX IF NOT EXISTS idx_stocks_current_price ON stocks(current_price);
CREATE INDEX IF NOT EXISTS idx_stocks_last_price_update ON stocks(last_price_update);
CREATE INDEX IF NOT EXISTS idx_stocks_is_active ON stocks(is_active);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol_active ON stocks(symbol, is_active);

-- Update existing stocks to be active by default
UPDATE stocks SET is_active = true WHERE is_active IS NULL;