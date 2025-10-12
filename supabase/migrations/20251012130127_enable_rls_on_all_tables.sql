/*
  # Enable Row Level Security on All Tables

  1. Security Changes
    - Enable RLS on portfolios, portfolio_holdings, transactions, dividends, and stock_prices tables
    - Create restrictive policies that maintain current application behavior
    
  2. Portfolios Table
    - Users can read, insert, update, and delete their own portfolios
    
  3. Portfolio Holdings Table
    - Users can read, insert, update, and delete holdings from their own portfolios
    
  4. Transactions Table
    - Users can read, insert, update, and delete transactions from their own portfolios
    
  5. Dividends Table
    - Public read access (market data available to all)
    - Only authenticated users can insert/update/delete (admin operations)
    
  6. Stock Prices Tables (1h, 1d, 30d)
    - Public read access (market data available to all)
    - No public write access (only system/edge functions can write)
*/

-- =====================================================
-- PORTFOLIOS TABLE
-- =====================================================

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolios"
  ON portfolios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios"
  ON portfolios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON portfolios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON portfolios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- PORTFOLIO HOLDINGS TABLE
-- =====================================================

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolio holdings"
  ON portfolio_holdings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_holdings.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own portfolio holdings"
  ON portfolio_holdings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_holdings.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own portfolio holdings"
  ON portfolio_holdings
  FOR UPDATE
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

CREATE POLICY "Users can delete own portfolio holdings"
  ON portfolio_holdings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_holdings.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
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

CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- =====================================================
-- DIVIDENDS TABLE (Market Data - Public Read)
-- =====================================================

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dividends"
  ON dividends
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dividends"
  ON dividends
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dividends"
  ON dividends
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dividends"
  ON dividends
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- STOCK PRICES TABLES (Market Data - Public Read)
-- =====================================================

-- stock_prices_1h
ALTER TABLE stock_prices_1h ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read 1h stock prices"
  ON stock_prices_1h
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_1d
ALTER TABLE stock_prices_1d ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read 1d stock prices"
  ON stock_prices_1d
  FOR SELECT
  TO authenticated
  USING (true);

-- stock_prices_30d
ALTER TABLE stock_prices_30d ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read 30d stock prices"
  ON stock_prices_30d
  FOR SELECT
  TO authenticated
  USING (true);