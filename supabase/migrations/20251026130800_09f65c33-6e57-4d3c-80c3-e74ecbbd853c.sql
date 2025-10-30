-- Fix trip_messages SELECT policy to use app_metadata instead of user_metadata
-- This prevents authentication bypass where users could modify their user_metadata to access unauthorized trip messages

DROP POLICY IF EXISTS "Participants can view trip messages" ON trip_messages;

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