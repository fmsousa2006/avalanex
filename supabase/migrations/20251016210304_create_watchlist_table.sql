/*
  # Create Watchlist Table

  1. New Tables
    - `watchlist`
      - `id` (uuid, primary key) - Unique identifier for each watchlist item
      - `user_id` (uuid, foreign key) - References auth.users
      - `stock_id` (uuid, foreign key) - References stocks table
      - `notes` (text, nullable) - Optional user notes about the stock
      - `target_price` (numeric, nullable) - Optional price target/alert
      - `created_at` (timestamptz) - When the stock was added to watchlist
      - `updated_at` (timestamptz) - Last modification timestamp

  2. Security
    - Enable RLS on `watchlist` table
    - Add policy for users to read their own watchlist items
    - Add policy for users to insert their own watchlist items
    - Add policy for users to update their own watchlist items
    - Add policy for users to delete their own watchlist items

  3. Indexes
    - Add index on (user_id, stock_id) for faster lookups and preventing duplicates
    - Add unique constraint to prevent duplicate stock entries per user

  4. Notes
    - Users can track stocks they're interested in without owning them
    - Each user can only have one entry per stock in their watchlist
    - RLS ensures users can only access their own watchlist data
*/

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  notes text,
  target_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stock_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_stock ON watchlist(user_id, stock_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own watchlist"
  ON watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items"
  ON watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items"
  ON watchlist FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items"
  ON watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watchlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS watchlist_updated_at ON watchlist;
CREATE TRIGGER watchlist_updated_at
  BEFORE UPDATE ON watchlist
  FOR EACH ROW
  EXECUTE FUNCTION update_watchlist_updated_at();