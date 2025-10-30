-- Create trip_messages table
CREATE TABLE public.trip_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trip_offers(id) ON DELETE CASCADE,
  sender_wallet_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages if they're the trip creator or a companion
CREATE POLICY "Users can view trip messages if participant"
ON public.trip_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_offers
    WHERE trip_offers.id = trip_messages.trip_id
    AND trip_offers.wallet_address = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trip_companions
    WHERE trip_companions.trip_id = trip_messages.trip_id
    AND trip_companions.companion_wallet_address = auth.uid()::text
  )
);

-- Policy: Users can insert messages if they're the trip creator or a companion
CREATE POLICY "Users can send messages if participant"
ON public.trip_messages
FOR INSERT
WITH CHECK (
  sender_wallet_address = auth.uid()::text
  AND (
    EXISTS (
      SELECT 1 FROM public.trip_offers
      WHERE trip_offers.id = trip_messages.trip_id
      AND trip_offers.wallet_address = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_companions
      WHERE trip_companions.trip_id = trip_messages.trip_id
      AND trip_companions.companion_wallet_address = auth.uid()::text
    )
  )
);

-- Policy: Users can update their own messages
CREATE POLICY "Users can edit own messages"
ON public.trip_messages
FOR UPDATE
USING (sender_wallet_address = auth.uid()::text)
WITH CHECK (sender_wallet_address = auth.uid()::text);

-- Policy: Users can delete their own messages or trip creator can delete any
CREATE POLICY "Users can delete own messages or trip creator can delete"
ON public.trip_messages
FOR DELETE
USING (
  sender_wallet_address = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM public.trip_offers
    WHERE trip_offers.id = trip_messages.trip_id
    AND trip_offers.wallet_address = auth.uid()::text
  )
);

-- Enable Realtime
ALTER TABLE public.trip_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;

-- Create index for better query performance
CREATE INDEX idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at DESC);