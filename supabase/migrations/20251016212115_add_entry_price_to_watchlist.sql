/*
  # Add Entry Price to Watchlist

  1. Changes
    - Add `entry_price` column to `watchlist` table
      - `entry_price` (numeric, not null) - The stock price at the moment it was added to watchlist
      - This allows users to track performance since they started watching the stock
    
  2. Notes
    - The entry_price is captured when the stock is first added
    - It's never updated (read-only after insertion)
    - Useful for comparing current price vs. when user started watching
    - created_at timestamp already exists for tracking when the stock was added
*/

-- Add entry_price column to watchlist table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'watchlist' AND column_name = 'entry_price'
  ) THEN
    ALTER TABLE watchlist ADD COLUMN entry_price numeric NOT NULL DEFAULT 0;
  END IF;
END $$;