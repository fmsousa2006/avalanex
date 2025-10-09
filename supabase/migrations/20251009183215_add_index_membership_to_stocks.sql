/*
  # Add Index Membership Tracking to Stocks

  1. Changes
    - Add `index_membership` column to stocks table (array of indices like SP500, NASDAQ100, DOW30)
    - Add index on is_active for efficient sync queries
    - Add index on index_membership for filtering

  2. Notes
    - Uses existing stocks table structure
    - is_active column already exists for tracking which stocks to sync
    - Compatible with existing portfolio and price tracking
*/

-- Add index_membership column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stocks' AND column_name = 'index_membership'
  ) THEN
    ALTER TABLE stocks ADD COLUMN index_membership text[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for efficient sync operations
CREATE INDEX IF NOT EXISTS idx_stocks_is_active 
  ON stocks(is_active) WHERE is_active = true;

-- Create index for filtering by index membership
CREATE INDEX IF NOT EXISTS idx_stocks_index_membership 
  ON stocks USING GIN(index_membership);