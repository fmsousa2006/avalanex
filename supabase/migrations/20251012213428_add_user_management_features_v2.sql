/*
  # Add User Management Features

  1. Changes
    - Add `account_status` column to track active/suspended accounts (default: 'active')
    - Add `admin_notes` table for admin to add notes about users
    - Add `user_activity_logs` table to track user actions
    - Update get_all_users_with_details function to include account_status
    
  2. Security
    - Enable RLS on new tables
    - Only admins can read/write admin notes
    - Only admins can read activity logs
    
  3. Notes
    - Account status is separate from subscription status
    - Activity logs will track important user actions
*/

-- Add account_status column to user_subscriptions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended'));
  END IF;
END $$;

-- Create admin_notes table
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Admin notes policies
CREATE POLICY "Admins can read all notes"
  ON admin_notes
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert notes"
  ON admin_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update notes"
  ON admin_notes
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete notes"
  ON admin_notes
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity logs policies
CREATE POLICY "Admins can read all activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "System can insert activity logs"
  ON user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop and recreate the get_all_users_with_details function to include account_status
DROP FUNCTION IF EXISTS get_all_users_with_details();

CREATE FUNCTION get_all_users_with_details()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  tier text,
  status text,
  account_status text,
  portfolio_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(us.subscription_tier, 'free')::text as tier,
    COALESCE(us.subscription_status, 'active')::text as status,
    COALESCE(us.account_status, 'active')::text as account_status,
    COUNT(DISTINCT p.id) as portfolio_count
  FROM auth.users au
  LEFT JOIN user_subscriptions us ON au.id = us.user_id
  LEFT JOIN portfolios p ON au.id = p.user_id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, us.subscription_tier, us.subscription_status, us.account_status
  ORDER BY au.created_at DESC;
END;
$$;
