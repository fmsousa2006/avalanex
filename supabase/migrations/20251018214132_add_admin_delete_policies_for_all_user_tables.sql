/*
  # Add Admin Delete Policies for All User-Related Tables

  1. Changes
    - Add DELETE policies for admins on portfolios, portfolio_holdings, transactions
    - Add DELETE policies for admins on watchlist, admin_notes
    - Enable admins to delete all user-related data

  2. Security
    - Only users with admin tier can delete user data
    - Maintains all existing security policies
*/

-- Portfolios: Allow admins to delete any portfolio
CREATE POLICY "Admins can delete any portfolio"
  ON portfolios
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Portfolio Holdings: Allow admins to delete any holdings
CREATE POLICY "Admins can delete any portfolio holdings"
  ON portfolio_holdings
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Transactions: Allow admins to delete any transactions
CREATE POLICY "Admins can delete any transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Watchlist: Allow admins to delete any watchlist entries
CREATE POLICY "Admins can delete any watchlist entries"
  ON watchlist
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Admin Notes: Allow admins to delete any admin notes
CREATE POLICY "Admins can delete any admin notes"
  ON admin_notes
  FOR DELETE
  TO authenticated
  USING (is_admin());
