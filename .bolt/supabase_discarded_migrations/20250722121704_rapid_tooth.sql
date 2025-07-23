/*
  # Create Historical Price Tables

  1. New Tables
    - `stock_prices_1d` - 1 day data with 1 hour granularity
    - `stock_prices_7d` - 7 days data with 1 hour granularity  
    - `stock_prices_30d` - 30 days data with 1 day granularity
    - `stock_prices_3m` - 3 months data with 1 day granularity
    - `stock_prices_6m` - 6 months data with 1 day granularity
    - `stock_prices_1y` - 1 year data with 1 day granularity
    - `stock_prices_3y` - 3 years data with 1 day granularity
    - `stock_prices_5y` - 5 years data with 1 day granularity

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read data
    - Add policies for system to insert/update data

  3. Indexes
    - Composite indexes on (stock_id, timestamp) for efficient queries
    - Individual indexes on stock_id and timestamp for filtering
*/

-- 1 Day Historical Prices (1 hour granularity)
CREATE TABLE IF NOT EXISTS stock_prices_1d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 7 Days Historical Prices (1 hour granularity)
CREATE TABLE IF NOT EXISTS stock_prices_7d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 30 Days Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_30d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 3 Months Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_3m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 6 Months Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_6m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 1 Year Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_1y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 3 Years Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_3y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- 5 Years Historical Prices (1 day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_5y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL,
  high_price numeric(10,4) NOT NULL,
  low_price numeric(10,4) NOT NULL,
  close_price numeric(10,4) NOT NULL,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stock_prices_1d_stock_timestamp ON stock_prices_1d(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1d_timestamp ON stock_prices_1d(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_7d_stock_timestamp ON stock_prices_7d(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_7d_timestamp ON stock_prices_7d(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_30d_stock_timestamp ON stock_prices_30d(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_30d_timestamp ON stock_prices_30d(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_3m_stock_timestamp ON stock_prices_3m(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3m_timestamp ON stock_prices_3m(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_6m_stock_timestamp ON stock_prices_6m(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_6m_timestamp ON stock_prices_6m(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_1y_stock_timestamp ON stock_prices_1y(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1y_timestamp ON stock_prices_1y(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_3y_stock_timestamp ON stock_prices_3y(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3y_timestamp ON stock_prices_3y(timestamp);

CREATE INDEX IF NOT EXISTS idx_stock_prices_5y_stock_timestamp ON stock_prices_5y(stock_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_5y_timestamp ON stock_prices_5y(timestamp);

-- Enable Row Level Security
ALTER TABLE stock_prices_1d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_7d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_30d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_3m ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_6m ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_1y ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_3y ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_5y ENABLE ROW LEVEL SECURITY;

-- Create policies for reading data (all authenticated users can read)
CREATE POLICY "Users can read 1d stock prices" ON stock_prices_1d FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 7d stock prices" ON stock_prices_7d FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 30d stock prices" ON stock_prices_30d FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 3m stock prices" ON stock_prices_3m FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 6m stock prices" ON stock_prices_6m FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 1y stock prices" ON stock_prices_1y FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 3y stock prices" ON stock_prices_3y FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read 5y stock prices" ON stock_prices_5y FOR SELECT TO authenticated USING (true);

-- Create policies for inserting/updating data (system operations)
CREATE POLICY "System can insert 1d stock prices" ON stock_prices_1d FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 7d stock prices" ON stock_prices_7d FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 30d stock prices" ON stock_prices_30d FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 3m stock prices" ON stock_prices_3m FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 6m stock prices" ON stock_prices_6m FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 1y stock prices" ON stock_prices_1y FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 3y stock prices" ON stock_prices_3y FOR INSERT TO authenticated USING (true);
CREATE POLICY "System can insert 5y stock prices" ON stock_prices_5y FOR INSERT TO authenticated USING (true);

CREATE POLICY "System can update 1d stock prices" ON stock_prices_1d FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 7d stock prices" ON stock_prices_7d FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 30d stock prices" ON stock_prices_30d FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 3m stock prices" ON stock_prices_3m FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 6m stock prices" ON stock_prices_6m FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 1y stock prices" ON stock_prices_1y FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 3y stock prices" ON stock_prices_3y FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can update 5y stock prices" ON stock_prices_5y FOR UPDATE TO authenticated USING (true);