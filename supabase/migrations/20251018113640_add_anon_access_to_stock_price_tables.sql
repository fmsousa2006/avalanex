/*
  # Add anonymous access to stock price tables
  
  1. Changes
    - Add SELECT policies for anonymous (anon) users to stock_prices_1h and stock_prices_30d tables
    - This allows the frontend to fetch price data without authentication
  
  2. Security
    - Stock price data is public information and safe to expose
    - Read-only access via SELECT policy
*/

-- Add anon access to stock_prices_1h
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_prices_1h' 
    AND policyname = 'Anyone can read 1h stock prices (anon)'
  ) THEN
    CREATE POLICY "Anyone can read 1h stock prices (anon)"
      ON stock_prices_1h
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add anon access to stock_prices_30d
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_prices_30d' 
    AND policyname = 'Anyone can read 30d stock prices (anon)'
  ) THEN
    CREATE POLICY "Anyone can read 30d stock prices (anon)"
      ON stock_prices_30d
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;