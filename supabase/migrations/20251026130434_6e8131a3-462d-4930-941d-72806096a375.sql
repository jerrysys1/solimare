-- Fix critical security issue: Switch RLS policies from user_metadata to app_metadata
-- user_metadata is mutable by users and can be exploited for privilege escalation
-- app_metadata can only be modified by admins, making it secure for access control

-- Step 1: Drop all existing policies that use user_metadata
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own boats" ON boats;
DROP POLICY IF EXISTS "Users can update own boats" ON boats;
DROP POLICY IF EXISTS "Users can delete own boats" ON boats;
DROP POLICY IF EXISTS "Users can create trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can update own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Users can delete own trip offers" ON trip_offers;
DROP POLICY IF EXISTS "Participants can send trip messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON trip_messages;
DROP POLICY IF EXISTS "Trip owner can manage companions" ON trip_companions;

-- Step 2: Recreate all policies using app_metadata instead of user_metadata

-- Profiles policies
CREATE POLICY "Users can insert own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
USING (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

-- Boats policies
CREATE POLICY "Users can create own boats" 
ON boats 
FOR INSERT 
WITH CHECK (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can update own boats" 
ON boats 
FOR UPDATE 
USING (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can delete own boats" 
ON boats 
FOR DELETE 
USING (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

-- Trip Offers policies
CREATE POLICY "Users can create trip offers" 
ON trip_offers 
FOR INSERT 
WITH CHECK (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can update own trip offers" 
ON trip_offers 
FOR UPDATE 
USING (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can delete own trip offers" 
ON trip_offers 
FOR DELETE 
USING (wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

-- Trip Messages policies
CREATE POLICY "Participants can send trip messages" 
ON trip_messages 
FOR INSERT 
WITH CHECK (
  (sender_wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text)) 
  AND (
    (EXISTS (SELECT 1 FROM trip_offers WHERE ((trip_offers.id = trip_messages.trip_id) AND (trip_offers.wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text))))) 
    OR (EXISTS (SELECT 1 FROM trip_companions WHERE ((trip_companions.trip_id = trip_messages.trip_id) AND (trip_companions.companion_wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text)))))
  )
);

CREATE POLICY "Users can edit own messages" 
ON trip_messages 
FOR UPDATE 
USING (sender_wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

CREATE POLICY "Users can delete own messages" 
ON trip_messages 
FOR DELETE 
USING (sender_wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text));

-- Trip Companions policies
CREATE POLICY "Trip owner can manage companions" 
ON trip_companions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM trip_offers 
    WHERE ((trip_offers.id = trip_companions.trip_id) AND (trip_offers.wallet_address = ((auth.jwt() -> 'app_metadata'::text) ->> 'wallet_address'::text)))
  )
);