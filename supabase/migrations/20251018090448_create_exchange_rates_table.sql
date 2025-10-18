/*
  # Create exchange rates table

  1. New Tables
    - `exchange_rates`
      - `id` (uuid, primary key) - Unique identifier
      - `base_currency` (text) - Base currency code (e.g., 'USD')
      - `target_currency` (text) - Target currency code (e.g., 'EUR')
      - `rate` (numeric) - Exchange rate value
      - `fetched_at` (timestamptz) - When the rate was fetched
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Index on (base_currency, target_currency) for fast lookups
    - Index on fetched_at for finding recent rates

  3. Security
    - Enable RLS on `exchange_rates` table
    - Add policy for authenticated users to read rates
    - Add policy for system to insert/update rates

  4. Notes
    - Rates are cached and refreshed once per day
    - All authenticated users can read rates
    - Minimizes API calls to Finnhub
*/

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric(20, 10) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
  ON exchange_rates(base_currency, target_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at 
  ON exchange_rates(fetched_at DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
