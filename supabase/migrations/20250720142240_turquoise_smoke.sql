/*
  # Insert Default Portfolio

  1. New Records
    - Insert a default portfolio record that will be used for all operations
    - Uses a fixed UUID so it's consistent across environments
    
  2. Purpose
    - Provides a single portfolio for the current phase of the project
    - All transactions and holdings will be associated with this portfolio
    - Eliminates the need for user authentication in this phase
*/

-- Insert default portfolio with fixed UUID
INSERT INTO portfolios (
  id,
  user_id, 
  name,
  description,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '00000000-0000-0000-0000-000000000000',
  'My Investment Portfolio',
  'Default portfolio for tracking investments',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;