-- Remove the foreign key constraint on trip_companions
-- This allows adding companions even if they don't have a profile yet
ALTER TABLE trip_companions 
DROP CONSTRAINT IF EXISTS trip_companions_companion_wallet_address_fkey;