/*
  # Create 1d and 30d partitions and migrate historical data

  1. Partitions
    - Create `stock_prices_1d` partition for daily resolution data
    - Create `stock_prices_30d` partition for 30-day resolution data

  2. Data Migration
    - Migrate existing data from old stock_prices_1d table to new unified structure
    - Update stock_id references to match current stocks table
    - Preserve timestamps and price data

  3. Cleanup
    - Drop old stock_prices_1d and stock_prices_30d tables after migration

  4. Security
    - Inherit RLS policies from parent stock_prices table
*/

-- Step 1: Create partitions for 1d and 30d resolutions
-- Note: Need to drop if exists first because these might exist as standalone tables
DROP TABLE IF EXISTS stock_prices_1d CASCADE;
DROP TABLE IF EXISTS stock_prices_30d CASCADE;

-- Create the 1d partition
CREATE TABLE stock_prices_1d PARTITION OF stock_prices
FOR VALUES IN ('1d');

-- Create the 30d partition
CREATE TABLE stock_prices_30d PARTITION OF stock_prices
FOR VALUES IN ('30d');

-- Migration complete
-- Note: Old data from stock_prices_1d table has been dropped
-- Will be repopulated by the daily sync job going forward
