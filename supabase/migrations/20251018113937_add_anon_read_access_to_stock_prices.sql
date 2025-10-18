/*
  # Add anonymous read access to stock_prices table
  
  1. Changes
    - Add SELECT policy for anonymous (anon) users to stock_prices table
    - This allows the frontend to fetch price data without authentication
  
  2. Security
    - Stock price data is public information and safe to expose
    - Read-only access via SELECT policy
    - Applies to parent table and all partitions (1h, 1d, 30d)
*/

-- Add anon access to stock_prices (parent table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_prices' 
    AND policyname = 'Anonymous users can read stock prices'
  ) THEN
    CREATE POLICY "Anonymous users can read stock prices"
      ON stock_prices
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;