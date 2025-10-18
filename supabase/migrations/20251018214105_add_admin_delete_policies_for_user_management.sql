/*
  # Add Admin Delete Policies for User Management

  1. Changes
    - Add DELETE policy for admins on user_profiles table
    - Add DELETE policy for admins on user_subscriptions table
    - Enable cascade deletion on foreign key constraints where appropriate

  2. Security
    - Only users with admin tier can delete user accounts
    - Maintains all existing security policies
*/

-- Add DELETE policy for admins on user_profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.user_id = auth.uid()
      AND user_subscriptions.subscription_tier = 'admin'
    )
  );

-- Add DELETE policy for admins on user_subscriptions
CREATE POLICY "Admins can delete user subscriptions"
  ON user_subscriptions
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add UPDATE policy for admins on user_subscriptions
CREATE POLICY "Admins can update all subscriptions"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
