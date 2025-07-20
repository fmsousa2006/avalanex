/*
  # Fix RLS policies for stocks table

  1. Security Updates
    - Add INSERT policy for authenticated users to create stocks
    - Add UPDATE policy for authenticated users to update stocks
    - Keep existing SELECT policy for reading stocks

  This allows the application to create and update stock records when adding transactions.
*/

-- Add policy to allow authenticated users to insert stocks
CREATE POLICY "Authenticated users can insert stocks"
  ON stocks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add policy to allow authenticated users to update stocks
CREATE POLICY "Authenticated users can update stocks"
  ON stocks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);