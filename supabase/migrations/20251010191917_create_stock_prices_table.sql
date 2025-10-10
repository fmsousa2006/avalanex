/*
  # Create stock_prices table for hourly market data

  1. New Table
    - `stock_prices` - Main table for storing hourly stock price data from market sync
      - `id` (uuid, primary key) - Unique identifier
      - `stock_id` (uuid, foreign key) - References stocks table
      - `timestamp` (timestamptz) - When the price was recorded
      - `resolution` (text) - Time resolution (e.g., '1h', '1d')
      - `open_price` (numeric) - Opening price for the period
      - `high_price` (numeric) - Highest price for the period
      - `low_price` (numeric) - Lowest price for the period
      - `close_price` (numeric) - Closing price for the period
      - `volume` (bigint) - Trading volume
      - `created_at` (timestamptz) - Record creation timestamp

  2. Indexes
    - Composite primary key on (stock_id, timestamp, resolution) for efficient lookups
    - Index on timestamp for time-based queries

  3. Security
    - Enable RLS on stock_prices table
    - Add policy for authenticated users to read all stock prices

  4. Purpose
    - Used by sync-market-data edge function to store hourly price updates
    - Provides historical price data for charts and analytics
*/

-- Create stock_prices table
CREATE TABLE IF NOT EXISTS stock_prices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  resolution text NOT NULL,
  open_price numeric NOT NULL DEFAULT 0,
  high_price numeric NOT NULL DEFAULT 0,
  low_price numeric NOT NULL DEFAULT 0,
  close_price numeric NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (stock_id, timestamp, resolution)
);

-- Create index on timestamp for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(timestamp);

-- Create index on stock_id for efficient stock-based queries
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock_id ON stock_prices(stock_id);

-- Enable Row Level Security
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all stock prices
CREATE POLICY "Authenticated users can read stock prices"
  ON stock_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow the service role to insert stock prices (for edge functions)
CREATE POLICY "Service role can insert stock prices"
  ON stock_prices
  FOR INSERT
  TO service_role
  WITH CHECK (true);
