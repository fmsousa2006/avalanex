/*
  # Fix RLS policies for stocks table

  1. Security Updates
    - Drop existing restrictive policies that prevent INSERT/UPDATE operations
    - Add new policies allowing authenticated users to INSERT and UPDATE stocks
    - Keep existing SELECT policy for reading stocks

  2. Policy Changes
    - Allow any authenticated user to insert new stock records
    - Allow any authenticated user to update existing stock records
    - This enables the upsert operation needed when adding transactions
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Authenticated users can insert stocks" ON stocks;
DROP POLICY IF EXISTS "Authenticated users can update stocks" ON stocks;

-- Create new policies that allow INSERT and UPDATE for authenticated users
CREATE POLICY "Allow authenticated users to insert stocks"
  ON stocks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stocks"
  ON stocks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);