/*
  # Create Historical Price Tables

  1. New Tables
    - `stock_prices_1d` - 1 day historical data with 1-hour granularity
    - `stock_prices_7d` - 7 days historical data with 1-hour granularity  
    - `stock_prices_30d` - 30 days historical data with 1-day granularity
    - `stock_prices_3m` - 3 months historical data with 1-day granularity
    - `stock_prices_6m` - 6 months historical data with 1-day granularity
    - `stock_prices_1y` - 1 year historical data with 1-day granularity
    - `stock_prices_3y` - 3 years historical data with 1-day granularity
    - `stock_prices_5y` - 5 years historical data with 1-day granularity

  2. Security
    - Enable RLS on all historical price tables
    - Add policies for authenticated users to read data

  3. Indexes
    - Composite indexes on (stock_id, timestamp) for efficient queries
    - Individual indexes on stock_id and timestamp for filtering
*/

-- Create stock_prices_1d table (1 day, 1-hour granularity)
CREATE TABLE IF NOT EXISTS stock_prices_1d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_7d table (7 days, 1-hour granularity)
CREATE TABLE IF NOT EXISTS stock_prices_7d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_30d table (30 days, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_30d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_3m table (3 months, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_3m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_6m table (6 months, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_6m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_1y table (1 year, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_1y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_3y table (3 years, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_3y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create stock_prices_5y table (5 years, 1-day granularity)
CREATE TABLE IF NOT EXISTS stock_prices_5y (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  open_price numeric(10,4) NOT NULL DEFAULT 0,
  high_price numeric(10,4) NOT NULL DEFAULT 0,
  low_price numeric(10,4) NOT NULL DEFAULT 0,
  close_price numeric(10,4) NOT NULL DEFAULT 0,
  volume bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, timestamp)
);

-- Create indexes for efficient querying

-- stock_prices_1d indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_1d_stock_id ON stock_prices_1d(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1d_timestamp ON stock_prices_1d(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1d_stock_timestamp ON stock_prices_1d(stock_id, timestamp);

-- stock_prices_7d indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_7d_stock_id ON stock_prices_7d(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_7d_timestamp ON stock_prices_7d(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_7d_stock_timestamp ON stock_prices_7d(stock_id, timestamp);

-- stock_prices_30d indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_30d_stock_id ON stock_prices_30d(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_30d_timestamp ON stock_prices_30d(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_30d_stock_timestamp ON stock_prices_30d(stock_id, timestamp);

-- stock_prices_3m indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_3m_stock_id ON stock_prices_3m(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3m_timestamp ON stock_prices_3m(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3m_stock_timestamp ON stock_prices_3m(stock_id, timestamp);

-- stock_prices_6m indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_6m_stock_id ON stock_prices_6m(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_6m_timestamp ON stock_prices_6m(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_6m_stock_timestamp ON stock_prices_6m(stock_id, timestamp);

-- stock_prices_1y indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_1y_stock_id ON stock_prices_1y(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1y_timestamp ON stock_prices_1y(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_1y_stock_timestamp ON stock_prices_1y(stock_id, timestamp);

-- stock_prices_3y indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_3y_stock_id ON stock_prices_3y(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3y_timestamp ON stock_prices_3y(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_3y_stock_timestamp ON stock_prices_3y(stock_id, timestamp);

-- stock_prices_5y indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_5y_stock_id ON stock_prices_5y(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_5y_timestamp ON stock_prices_5y(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_5y_stock_timestamp ON stock_prices_5y(stock_id, timestamp);

-- Enable Row Level Security on all historical price tables
ALTER TABLE stock_prices_1d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_7d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_30d ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_3m ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_6m ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_1y ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_3y ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices_5y ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read historical price data

-- stock_prices_1d policies
CREATE POLICY "Authenticated users can read 1d price data"
  ON stock_prices_1d
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_7d policies
CREATE POLICY "Authenticated users can read 7d price data"
  ON stock_prices_7d
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_30d policies
CREATE POLICY "Authenticated users can read 30d price data"
  ON stock_prices_30d
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_3m policies
CREATE POLICY "Authenticated users can read 3m price data"
  ON stock_prices_3m
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_6m policies
CREATE POLICY "Authenticated users can read 6m price data"
  ON stock_prices_6m
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_1y policies
CREATE POLICY "Authenticated users can read 1y price data"
  ON stock_prices_1y
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_3y policies
CREATE POLICY "Authenticated users can read 3y price data"
  ON stock_prices_3y
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_5y policies
CREATE POLICY "Authenticated users can read 5y price data"
  ON stock_prices_5y
  FOR SELECT
  TO authenticated
  USING (true);