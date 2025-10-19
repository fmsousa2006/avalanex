/*
  # Fix User Status for Unconfirmed Emails

  1. Changes
    - Update get_all_users_with_details function to check email_confirmed_at
    - Return 'pending' status for users who haven't confirmed their email
    - Return 'active' status for users with confirmed emails and active subscription
    
  2. Notes
    - Users who haven't clicked the confirmation link will show as 'pending'
    - Once email is confirmed, status will reflect subscription status
*/

-- Drop and recreate the get_all_users_with_details function
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
    CASE
      WHEN au.email_confirmed_at IS NULL THEN 'pending'::text
      ELSE COALESCE(us.subscription_status, 'active')::text
    END as status,
    COALESCE(us.account_status, 'active')::text as account_status,
    COUNT(DISTINCT p.id) as portfolio_count
  FROM auth.users au
  LEFT JOIN user_subscriptions us ON au.id = us.user_id
  LEFT JOIN portfolios p ON au.id = p.user_id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, au.email_confirmed_at, us.subscription_tier, us.subscription_status, us.account_status
  ORDER BY au.created_at DESC;
END;
$$;
