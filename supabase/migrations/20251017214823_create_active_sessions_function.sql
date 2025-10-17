/*
  # Create Active Sessions Count Function

  1. Function
    - `get_active_sessions_count` - Returns count of users who signed in within specified time threshold
    - Queries auth.users table for recent sign-ins
    - Returns integer count
    
  2. Purpose
    - Efficiently count active sessions for admin dashboard
    - Queries auth schema directly for better performance
*/

-- Create function to count active sessions
CREATE OR REPLACE FUNCTION get_active_sessions_count(time_threshold timestamptz)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM auth.users
  WHERE last_sign_in_at >= time_threshold;
$$;
