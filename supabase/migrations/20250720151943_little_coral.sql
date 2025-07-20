/*
  # Fix Transactions RLS Policy

  1. Security Updates
    - Update INSERT policy for transactions table to properly check portfolio ownership
    - Ensure authenticated users can insert transactions for their own portfolios

  2. Changes
    - Drop existing INSERT policy if it exists
    - Create new INSERT policy that verifies portfolio ownership through portfolios table
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can manage their portfolio transactions" ON transactions;

-- Create new comprehensive policy for all operations
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