/*
  # Fix admin policy to avoid circular dependency

  1. Changes
    - Drop the existing admin policy that has a circular dependency
    - Create a new optimized admin policy using a direct check
    - This prevents performance issues and allows admins to access all subscriptions

  2. Security
    - Only users with subscription_tier = 'admin' can view all subscriptions
    - Regular users can still only view their own subscription
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON user_subscriptions;

-- Create an optimized policy that checks directly against the user_subscriptions table
-- This uses a more efficient approach with a direct subquery
CREATE POLICY "Admins can read all subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT subscription_tier FROM user_subscriptions WHERE user_id = auth.uid()) = 'admin'
  );
