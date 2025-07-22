/*
  # Add Realty Income (O) Stock for Testing

  1. New Stock Entry
    - Add Realty Income Corporation (O) to stocks table
    - Set as active for price monitoring
    - Include basic company information

  2. Configuration
    - Enable for real-time price updates
    - Set initial placeholder values that will be updated by Finnhub
*/

-- Insert Realty Income stock if it doesn't exist
INSERT INTO stocks (
  symbol,
  name,
  sector,
  market_cap,
  is_active,
  created_at
) VALUES (
  'O',
  'Realty Income Corporation',
  'Real Estate Investment Trust',
  '50B+',
  true,
  now()
) ON CONFLICT (symbol) DO UPDATE SET
  name = EXCLUDED.name,
  sector = EXCLUDED.sector,
  market_cap = EXCLUDED.market_cap,
  is_active = true;