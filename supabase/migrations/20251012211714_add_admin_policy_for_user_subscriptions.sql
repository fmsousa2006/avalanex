/*
  # Add admin policy for user_subscriptions table

  1. Changes
    - Add a SELECT policy for admin users to view all user subscriptions
    - This allows admins in the User Management section to see accurate stats

  2. Security
    - Only users with subscription_tier = 'admin' can view all subscriptions
    - Regular users can still only view their own subscription
*/

CREATE POLICY "Admins can read all subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND subscription_tier = 'admin'
    )
  );
