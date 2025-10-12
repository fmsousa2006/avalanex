/*
  # Add Admin Tier to User Subscriptions

  1. Changes
    - Modify the subscription_tier check constraint to include 'admin' as a valid tier
    - Update fmsousa2006@gmail.com user subscription to 'admin' tier

  2. Security
    - No changes to RLS policies
*/

-- Drop existing constraint
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS valid_subscription_tier;

-- Add new constraint with admin tier
ALTER TABLE user_subscriptions 
ADD CONSTRAINT valid_subscription_tier 
CHECK (subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'admin'::text]));

-- Update the user subscription to admin
UPDATE user_subscriptions 
SET subscription_tier = 'admin', 
    updated_at = now()
WHERE user_id = '49be5272-a0ba-4d3a-9b17-c119181bb0e9';
