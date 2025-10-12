/*
  # Create User Management Function

  1. New Function
    - `get_all_users_with_details()` - Returns all users with their subscription and portfolio information
  
  2. Details
    - Fetches data from auth.users (requires proper permissions)
    - Joins with user_subscriptions for tier and status
    - Counts portfolios per user
    - Returns comprehensive user information for admin management
  
  3. Security
    - Function runs with definer privileges to access auth.users
    - Should only be callable by admin users (enforce in application layer)
*/

-- Create a function to get user details with portfolio counts
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
    u.email,
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

-- Grant execute permission to authenticated users (application should enforce admin-only access)
GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO authenticated;
