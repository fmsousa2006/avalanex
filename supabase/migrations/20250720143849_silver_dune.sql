/*
  # Insert Default Portfolio for Specific User

  1. New Records
    - `portfolios`
      - `id` (uuid, fixed ID for consistency)
      - `user_id` (uuid, specific user ID provided)
      - `name` (text, default portfolio name)
      - `description` (text, portfolio description)
      - `created_at` (timestamp, current time)
      - `updated_at` (timestamp, current time)

  2. Security
    - Uses the specific user ID: 49be5272-a0ba-4d3a-9b17-c119181bb0e9
    - Portfolio will be accessible by this user through RLS policies

  3. Notes
    - Uses ON CONFLICT DO NOTHING to prevent duplicate insertions
    - Fixed portfolio ID ensures consistency across environments
*/

INSERT INTO portfolios (
  id,
  user_id,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '49be5272-a0ba-4d3a-9b17-c119181bb0e9',
  'My Investment Portfolio',
  'Primary investment portfolio for tracking stocks and dividends',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;