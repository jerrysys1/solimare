-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Users can create own boats" ON boats;
DROP POLICY IF EXISTS "Users can update own boats" ON boats;
DROP POLICY IF EXISTS "Users can delete own boats" ON boats;
DROP POLICY IF EXISTS "Users can create trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can update own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can delete own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage companions" ON trip_companions;
DROP POLICY IF EXISTS "Anyone can send trip messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can edit messages by wallet address" ON trip_messages;
DROP POLICY IF EXISTS "Users can delete messages by wallet address" ON trip_messages;

-- Boats table: Enforce wallet ownership
CREATE POLICY "Users can create own boats"
ON boats FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own boats"
ON boats FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own boats"
ON boats FOR DELETE
USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

-- Trip offers: Enforce wallet ownership
CREATE POLICY "Users can create trip offers"
ON trip_offers FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own trip offers"
ON trip_offers FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own trip offers"
ON trip_offers FOR DELETE
USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

-- Profiles: Enforce wallet ownership
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

-- Trip companions: Only trip owner can manage
DROP POLICY IF EXISTS "Anyone can view trip companions" ON trip_companions;

CREATE POLICY "Anyone can view trip companions"
ON trip_companions FOR SELECT
USING (true);

CREATE POLICY "Trip owner can manage companions"
ON trip_companions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trip_offers
    WHERE trip_offers.id = trip_companions.trip_id
    AND trip_offers.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  )
);

-- Trip messages: Only trip participants can access
DROP POLICY IF EXISTS "Anyone can view trip messages" ON trip_messages;

CREATE POLICY "Participants can view trip messages"
ON trip_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_offers
    WHERE trip_offers.id = trip_messages.trip_id
    AND trip_offers.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  )
  OR
  EXISTS (
    SELECT 1 FROM trip_companions
    WHERE trip_companions.trip_id = trip_messages.trip_id
    AND trip_companions.companion_wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  )
);

CREATE POLICY "Participants can send trip messages"
ON trip_messages FOR INSERT
WITH CHECK (
  sender_wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  AND (
    EXISTS (
      SELECT 1 FROM trip_offers
      WHERE trip_offers.id = trip_messages.trip_id
      AND trip_offers.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    )
    OR
    EXISTS (
      SELECT 1 FROM trip_companions
      WHERE trip_companions.trip_id = trip_messages.trip_id
      AND trip_companions.companion_wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    )
  )
);

CREATE POLICY "Users can edit own messages"
ON trip_messages FOR UPDATE
USING (sender_wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));

CREATE POLICY "Users can delete own messages"
ON trip_messages FOR DELETE
USING (sender_wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address'));