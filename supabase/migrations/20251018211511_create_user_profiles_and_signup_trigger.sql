/*
  # Create User Profiles and Sign-Up Automation

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `full_name` (text, not null)
      - `username` (text, unique, not null)
      - `country` (text)
      - `avatar_url` (text, nullable)
      - `bio` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_profiles` table
    - Users can read their own profile
    - Users can update their own profile
    - Admins can view all profiles

  3. Triggers
    - Auto-create user profile when new user signs up
    - Auto-create free subscription when new user signs up
    - Only trigger after email is confirmed

  4. Functions
    - `handle_new_user()` - Creates profile and subscription for new confirmed users
    - `update_updated_at()` - Auto-updates the updated_at timestamp
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  username text UNIQUE NOT NULL,
  country text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.user_id = auth.uid()
      AND user_subscriptions.subscription_tier = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_profile()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_profile();

-- Function to handle new user sign-up
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Create user profile (will be populated from sign-up metadata)
    INSERT INTO user_profiles (id, email, full_name, username, country)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      NEW.raw_user_meta_data->>'country'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create free subscription if doesn't exist
    INSERT INTO user_subscriptions (user_id, subscription_tier, subscription_status, account_status)
    VALUES (NEW.id, 'free', 'active', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
