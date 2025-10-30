-- Add VARCHAR constraints to all text columns to prevent database bloat
-- This enforces the same limits as the client-side Zod validation
-- Must drop and recreate policies that reference these columns

-- Drop all policies that reference wallet_address columns
DROP POLICY IF EXISTS "Users can create own boats" ON boats;
DROP POLICY IF EXISTS "Users can update own boats" ON boats;
DROP POLICY IF EXISTS "Users can delete own boats" ON boats;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can update own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can delete own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Trip owner can manage companions" ON trip_companions;
DROP POLICY IF EXISTS "Participants can send trip messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON trip_messages;
DROP POLICY IF EXISTS "Participants can view trip messages" ON trip_messages;

-- Boats table: Add length constraints
ALTER TABLE boats
  ALTER COLUMN name TYPE VARCHAR(60),
  ALTER COLUMN boat_type TYPE VARCHAR(50),
  ALTER COLUMN registration_number TYPE VARCHAR(60),
  ALTER COLUMN manufacturer TYPE VARCHAR(60),
  ALTER COLUMN description TYPE VARCHAR(500),
  ALTER COLUMN wallet_address TYPE VARCHAR(88);

-- Profiles table: Add length constraints
ALTER TABLE profiles
  ALTER COLUMN wallet_address TYPE VARCHAR(88),
  ALTER COLUMN display_name TYPE VARCHAR(60);

-- Trip offers table: Add length constraints
ALTER TABLE trip_offers
  ALTER COLUMN wallet_address TYPE VARCHAR(88),
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN place TYPE VARCHAR(100),
  ALTER COLUMN planner TYPE VARCHAR(60),
  ALTER COLUMN trip_type TYPE VARCHAR(50),
  ALTER COLUMN description TYPE VARCHAR(500);

-- Trip messages table: Add length constraints
ALTER TABLE trip_messages
  ALTER COLUMN sender_wallet_address TYPE VARCHAR(88),
  ALTER COLUMN message TYPE VARCHAR(2000);

-- Trip companions table: Add length constraints
ALTER TABLE trip_companions
  ALTER COLUMN companion_wallet_address TYPE VARCHAR(88);

-- Recreate all policies with exact same logic

-- Boats policies
CREATE POLICY "Users can create own boats"
ON boats FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own boats"
ON boats FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own boats"
ON boats FOR DELETE
USING (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

-- Profiles policies
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

-- Trip offers policies
CREATE POLICY "Users can create trip offers"
ON trip_offers FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own trip offers"
ON trip_offers FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own trip offers"
ON trip_offers FOR DELETE
USING (wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

-- Trip companions policies
CREATE POLICY "Trip owner can manage companions"
ON trip_companions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trip_offers
    WHERE trip_offers.id = trip_companions.trip_id
    AND trip_offers.wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
  )
);

-- Trip messages policies
CREATE POLICY "Participants can send trip messages"
ON trip_messages FOR INSERT
WITH CHECK (
  sender_wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
  AND (
    (EXISTS (
      SELECT 1 FROM trip_offers
      WHERE trip_offers.id = trip_messages.trip_id
      AND trip_offers.wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
    ))
    OR
    (EXISTS (
      SELECT 1 FROM trip_companions
      WHERE trip_companions.trip_id = trip_messages.trip_id
      AND trip_companions.companion_wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
    ))
  )
);

CREATE POLICY "Users can edit own messages"
ON trip_messages FOR UPDATE
USING (sender_wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own messages"
ON trip_messages FOR DELETE
USING (sender_wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

CREATE POLICY "Participants can view trip messages"
ON trip_messages FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM trip_offers
    WHERE trip_offers.id = trip_messages.trip_id
    AND trip_offers.wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
  ))
  OR
  (EXISTS (
    SELECT 1 FROM trip_companions
    WHERE trip_companions.trip_id = trip_messages.trip_id
    AND trip_companions.companion_wallet_address = (auth.jwt() -> 'app_metadata' ->> 'wallet_address')
  ))
);