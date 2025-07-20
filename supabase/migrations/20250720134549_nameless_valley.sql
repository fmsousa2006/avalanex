/*
  # Portfolio Management Database Schema

  1. New Tables
    - `portfolios`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stocks`
      - `id` (uuid, primary key)
      - `symbol` (text, unique)
      - `name` (text)
      - `sector` (text, optional)
      - `market_cap` (text, optional)
      - `created_at` (timestamp)
    
    - `portfolio_holdings`
      - `id` (uuid, primary key)
      - `portfolio_id` (uuid, references portfolios)
      - `stock_id` (uuid, references stocks)
      - `shares` (integer)
      - `average_cost` (decimal)
      - `current_price` (decimal)
      - `last_updated` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `portfolio_id` (uuid, references portfolios)
      - `stock_id` (uuid, references stocks)
      - `type` (text: 'buy', 'sell', 'dividend')
      - `shares` (integer, optional for dividends)
      - `price` (decimal, optional for dividends)
      - `amount` (decimal)
      - `fee` (decimal, default 0)
      - `currency` (text, default 'USD')
      - `transaction_date` (date)
      - `status` (text: 'completed', 'pending')
      - `created_at` (timestamp)
    
    - `dividends`
      - `id` (uuid, primary key)
      - `stock_id` (uuid, references stocks)
      - `amount` (decimal)
      - `ex_dividend_date` (date)
      - `payment_date` (date)
      - `record_date` (date, optional)
      - `dividend_yield` (decimal)
      - `frequency` (text: 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual')
      - `status` (text: 'upcoming', 'ex-dividend', 'paid')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own portfolios and related data

  3. Indexes
    - Add indexes for frequently queried columns
    - Optimize for portfolio performance queries
*/

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Portfolio',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  sector text,
  market_cap text,
  created_at timestamptz DEFAULT now()
);

-- Create portfolio_holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  shares integer NOT NULL DEFAULT 0,
  average_cost decimal(10,2) NOT NULL DEFAULT 0,
  current_price decimal(10,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(portfolio_id, stock_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('buy', 'sell', 'dividend')),
  shares integer,
  price decimal(10,2),
  amount decimal(10,2) NOT NULL,
  fee decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  transaction_date date NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  created_at timestamptz DEFAULT now()
);

-- Create dividends table
CREATE TABLE IF NOT EXISTS dividends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,4) NOT NULL,
  ex_dividend_date date NOT NULL,
  payment_date date NOT NULL,
  record_date date,
  dividend_yield decimal(5,2),
  frequency text DEFAULT 'Quarterly' CHECK (frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ex-dividend', 'paid')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolios
CREATE POLICY "Users can manage their own portfolios"
  ON portfolios
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for stocks (readable by all authenticated users)
CREATE POLICY "Authenticated users can read stocks"
  ON stocks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stocks"
  ON stocks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for portfolio_holdings
CREATE POLICY "Users can manage their portfolio holdings"
  ON portfolio_holdings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = portfolio_holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = portfolio_holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- Create policies for transactions
CREATE POLICY "Users can manage their portfolio transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- Create policies for dividends (readable by all authenticated users)
CREATE POLICY "Authenticated users can read dividends"
  ON dividends
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage dividends"
  ON dividends
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_stock_id ON portfolio_holdings(stock_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_dividends_stock_id ON dividends(stock_id);
CREATE INDEX IF NOT EXISTS idx_dividends_payment_date ON dividends(payment_date);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);

-- Insert some initial stock data
INSERT INTO stocks (symbol, name, sector, market_cap) VALUES
  ('AAPL', 'Apple Inc.', 'Technology', '2.8T'),
  ('MSFT', 'Microsoft Corporation', 'Technology', '2.5T'),
  ('GOOGL', 'Alphabet Inc.', 'Technology', '1.7T'),
  ('AMZN', 'Amazon.com Inc.', 'Consumer Discretionary', '1.5T'),
  ('TSLA', 'Tesla Inc.', 'Consumer Discretionary', '800B'),
  ('NVDA', 'NVIDIA Corporation', 'Technology', '1.8T'),
  ('META', 'Meta Platforms Inc.', 'Technology', '800B'),
  ('NFLX', 'Netflix Inc.', 'Communication Services', '200B'),
  ('KO', 'The Coca-Cola Company', 'Consumer Staples', '260B'),
  ('JNJ', 'Johnson & Johnson', 'Healthcare', '450B'),
  ('PG', 'Procter & Gamble', 'Consumer Staples', '380B')
ON CONFLICT (symbol) DO NOTHING;

-- Insert some sample dividend data
INSERT INTO dividends (stock_id, amount, ex_dividend_date, payment_date, dividend_yield, frequency, status) VALUES
  ((SELECT id FROM stocks WHERE symbol = 'AAPL'), 0.24, '2024-02-09', '2024-02-15', 0.52, 'Quarterly', 'upcoming'),
  ((SELECT id FROM stocks WHERE symbol = 'MSFT'), 0.75, '2024-02-14', '2024-03-14', 0.89, 'Quarterly', 'ex-dividend'),
  ((SELECT id FROM stocks WHERE symbol = 'KO'), 0.46, '2024-02-28', '2024-04-01', 2.95, 'Quarterly', 'upcoming'),
  ((SELECT id FROM stocks WHERE symbol = 'JNJ'), 1.13, '2024-02-26', '2024-03-12', 2.87, 'Quarterly', 'upcoming'),
  ((SELECT id FROM stocks WHERE symbol = 'PG'), 0.9379, '2024-01-19', '2024-02-15', 2.41, 'Quarterly', 'paid')
ON CONFLICT DO NOTHING;