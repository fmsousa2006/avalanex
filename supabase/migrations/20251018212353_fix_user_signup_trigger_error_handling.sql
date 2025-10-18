/*
  # Fix User Sign-Up Trigger Error Handling

  1. Changes
    - Update trigger to handle errors gracefully
    - Only create profile if it doesn't exist
    - Generate unique username if not provided
    - Wrap in exception handling to prevent login failures

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Function to handle new user sign-up with better error handling
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_country text;
BEGIN
  -- Only proceed if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    BEGIN
      -- Check if profile already exists
      IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
        -- Get or generate username
        v_username := COALESCE(
          NEW.raw_user_meta_data->>'username',
          'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12)
        );
        
        -- Get or generate full name
        v_full_name := COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          split_part(NEW.email, '@', 1)
        );
        
        -- Get country
        v_country := NEW.raw_user_meta_data->>'country';
        
        -- Create user profile
        INSERT INTO user_profiles (id, email, full_name, username, country)
        VALUES (NEW.id, NEW.email, v_full_name, v_username, v_country)
        ON CONFLICT (id) DO NOTHING;
      END IF;
      
      -- Create free subscription if doesn't exist
      IF NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = NEW.id) THEN
        INSERT INTO user_subscriptions (user_id, subscription_tier, subscription_status, account_status)
        VALUES (NEW.id, 'free', 'active', 'active')
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the authentication
      RAISE WARNING 'Error in handle_new_user_signup for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();
