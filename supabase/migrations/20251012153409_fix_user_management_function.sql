/*
  # Fix User Management Function

  1. Changes
    - Update return type for email to match auth.users column type (varchar)
    - Cast all text fields properly to match expected types
  
  2. Details
    - email is varchar(255) in auth.users, needs to be cast to text
    - tier and status are already text in the return
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_all_users_with_details();

-- Recreate with proper type casting
CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  tier text,
  status text,
  portfolio_count bigint
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(us.subscription_tier, 'free')::text as tier,
    COALESCE(us.subscription_status, 'active')::text as status,
    COALESCE(
      (SELECT COUNT(*) FROM portfolios p WHERE p.user_id = u.id),
      0
    ) as portfolio_count
  FROM auth.users u
  LEFT JOIN user_subscriptions us ON us.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO authenticated;
