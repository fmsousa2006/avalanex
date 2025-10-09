/*
  # Remove Unused Stock Price Partition Tables

  1. Cleanup
    - Remove unused stock price partition tables that were created but never used
    - Keep only: stock_prices (main), stock_prices_1d, stock_prices_30d
    - Remove: 1h, 1mo, 1w, 1y, 3m, 3y, 5min, 5y, 6m, 7d, default

  2. Tables Being Removed
    - stock_prices_1h (32 kB) - Not used
    - stock_prices_1mo (16 kB) - Not used
    - stock_prices_1w (16 kB) - Not used
    - stock_prices_1y (40 kB) - Not used
    - stock_prices_3m (40 kB) - Not used
    - stock_prices_3y (40 kB) - Not used
    - stock_prices_5min (16 kB) - Not used
    - stock_prices_5y (40 kB) - Not used
    - stock_prices_6m (40 kB) - Not used
    - stock_prices_7d (40 kB) - Not used
    - stock_prices_default (16 kB) - Not used

  3. Tables Kept
    - stock_prices - Main table for hourly market data sync
    - stock_prices_1d - Used by StockDetailModal
    - stock_prices_30d - Used by portfolio 30-day historical data

  4. Also Check
    - api_calls table - May be replaced by api_calls_tracking
*/

-- Drop unused stock price partition tables
DROP TABLE IF EXISTS stock_prices_1h CASCADE;
DROP TABLE IF EXISTS stock_prices_1mo CASCADE;
DROP TABLE IF EXISTS stock_prices_1w CASCADE;
DROP TABLE IF EXISTS stock_prices_1y CASCADE;
DROP TABLE IF EXISTS stock_prices_3m CASCADE;
DROP TABLE IF EXISTS stock_prices_3y CASCADE;
DROP TABLE IF EXISTS stock_prices_5min CASCADE;
DROP TABLE IF EXISTS stock_prices_5y CASCADE;
DROP TABLE IF EXISTS stock_prices_6m CASCADE;
DROP TABLE IF EXISTS stock_prices_7d CASCADE;
DROP TABLE IF EXISTS stock_prices_default CASCADE;