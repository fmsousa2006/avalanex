/*
  # Modify exchange_rates table for historical data

  1. Changes
    - Drop existing unique constraint on (base_currency, target_currency)
    - Add new unique constraint on (base_currency, target_currency, fetched_at)
    - This allows storing historical daily exchange rates
    
  2. Notes
    - Existing data will be preserved
    - Now supports multiple rates per currency pair with different timestamps
*/

-- Drop the existing unique index
DROP INDEX IF EXISTS idx_exchange_rates_currencies;

-- Create a new unique index that includes the full timestamp
CREATE UNIQUE INDEX idx_exchange_rates_currencies_timestamp 
  ON exchange_rates(base_currency, target_currency, fetched_at);
