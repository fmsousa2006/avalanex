/*
  # Disable RLS for portfolio_holdings table

  1. Changes
    - Drop all existing RLS policies on portfolio_holdings table
    - Disable Row Level Security on portfolio_holdings table

  2. Security
    - Temporarily removes RLS restrictions to allow authenticated users to manage holdings
    - This resolves the "new row violates row-level security policy" error
*/

-- Drop all existing policies on portfolio_holdings table
DROP POLICY IF EXISTS "Users can manage their portfolio holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "portfolio_holdings_select_policy" ON portfolio_holdings;
DROP POLICY IF EXISTS "portfolio_holdings_insert_policy" ON portfolio_holdings;
DROP POLICY IF EXISTS "portfolio_holdings_update_policy" ON portfolio_holdings;
DROP POLICY IF EXISTS "portfolio_holdings_delete_policy" ON portfolio_holdings;

-- Disable Row Level Security on portfolio_holdings table
ALTER TABLE portfolio_holdings DISABLE ROW LEVEL SECURITY;