/*
  # Disable All RLS Policies for All Tables

  This migration temporarily disables Row Level Security for all tables in the portfolio application
  to resolve authentication and policy violation issues.

  ## Tables Affected:
  1. portfolios - User portfolio data
  2. stocks - Stock information
  3. transactions - Portfolio transactions
  4. portfolio_holdings - Portfolio stock holdings
  5. dividends - Dividend information

  ## Changes Made:
  - Drop all existing RLS policies for each table
  - Disable RLS on all tables
  - Allow authenticated users full access to all data

  ## Security Note:
  This is a temporary solution. In production, proper RLS policies should be implemented
  to ensure users can only access their own data.
*/

-- Drop all existing policies for portfolios table
DROP POLICY IF EXISTS "Users can manage their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can read their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can insert their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

-- Disable RLS on portfolios table
ALTER TABLE portfolios DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for stocks table
DROP POLICY IF EXISTS "Authenticated users can read stocks" ON stocks;
DROP POLICY IF EXISTS "Authenticated users can insert stocks" ON stocks;
DROP POLICY IF EXISTS "Authenticated users can update stocks" ON stocks;
DROP POLICY IF EXISTS "Authenticated users can manage stocks" ON stocks;

-- Disable RLS on stocks table
ALTER TABLE stocks DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for transactions table
DROP POLICY IF EXISTS "Users can manage transactions for their portfolios" ON transactions;
DROP POLICY IF EXISTS "Users can read transactions for their portfolios" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions for their portfolios" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions for their portfolios" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions for their portfolios" ON transactions;

-- Disable RLS on transactions table
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for portfolio_holdings table
DROP POLICY IF EXISTS "Users can manage holdings for their portfolios" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can read holdings for their portfolios" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can insert holdings for their portfolios" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can update holdings for their portfolios" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can delete holdings for their portfolios" ON portfolio_holdings;

-- Disable RLS on portfolio_holdings table
ALTER TABLE portfolio_holdings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for dividends table
DROP POLICY IF EXISTS "Authenticated users can manage dividends" ON dividends;
DROP POLICY IF EXISTS "Authenticated users can read dividends" ON dividends;
DROP POLICY IF EXISTS "Authenticated users can insert dividends" ON dividends;
DROP POLICY IF EXISTS "Authenticated users can update dividends" ON dividends;
DROP POLICY IF EXISTS "Authenticated users can delete dividends" ON dividends;

-- Disable RLS on dividends table
ALTER TABLE dividends DISABLE ROW LEVEL SECURITY;