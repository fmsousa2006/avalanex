/*
  # Add DELETE policy to stocks table

  1. Changes
    - Add DELETE policy to allow authenticated users to delete stocks
    
  2. Security
    - Only authenticated users can delete stocks
    - This enables admin functionality for stock management
*/

-- Add policy to allow authenticated users to delete stocks
CREATE POLICY "Authenticated users can delete stocks"
  ON stocks
  FOR DELETE
  TO authenticated
  USING (true);
