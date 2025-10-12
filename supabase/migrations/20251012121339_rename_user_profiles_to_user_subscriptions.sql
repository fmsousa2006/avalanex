/*
  # Rename user_profiles to user_subscriptions

  1. Changes
    - Rename table from `user_profiles` to `user_subscriptions`
    - Rename all associated indexes
    - Rename trigger function
    - Recreate policies with new table name
    
  2. Notes
    - All existing data is preserved
    - All RLS policies remain functionally the same
    - Trigger automation continues to work
*/

-- Rename the table
ALTER TABLE IF EXISTS user_profiles RENAME TO user_subscriptions;

-- Rename indexes
ALTER INDEX IF EXISTS idx_user_profiles_user_id RENAME TO idx_user_subscriptions_user_id;
ALTER INDEX IF EXISTS idx_user_profiles_subscription_tier RENAME TO idx_user_subscriptions_subscription_tier;
ALTER INDEX IF EXISTS idx_user_profiles_subscription_status RENAME TO idx_user_subscriptions_subscription_status;

-- Rename the update trigger function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_profile_updated_at') THEN
    ALTER FUNCTION update_user_profile_updated_at() RENAME TO update_user_subscription_updated_at;
  END IF;
END $$;

-- Drop old trigger and recreate with new name
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_updated_at();

-- Policies are automatically associated with the renamed table, no need to recreate