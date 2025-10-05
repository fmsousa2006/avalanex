/*
  # Remove status column from dividends table

  1. Changes
    - Remove the `status` column from the `dividends` table
    - Status will now be calculated dynamically based on the current date vs payment_date
    
  2. Notes
    - If current date < payment_date: status = "upcoming"
    - If current date >= payment_date: status = "paid"
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dividends' AND column_name = 'status'
  ) THEN
    ALTER TABLE dividends DROP COLUMN status;
  END IF;
END $$;
