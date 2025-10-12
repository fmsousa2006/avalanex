/*
  # Fix infinite recursion in admin policy

  1. Changes
    - Drop the problematic admin policy that causes infinite recursion
    - Create a helper function to check if a user is an admin
    - Create new policies using the helper function to avoid recursion
    
  2. Security
    - Users can still read their own subscription
    - Admins can read all subscriptions without causing recursion
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can read own profile" ON user_subscriptions;

-- Create a function to check if the current user is an admin
-- This function uses security definer to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'admin'
  );
$$;

-- Create new policies using the helper function
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (is_admin());
