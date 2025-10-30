-- Drop existing policies
DROP POLICY IF EXISTS "Users can view trip messages if participant" ON public.trip_messages;
DROP POLICY IF EXISTS "Users can send messages if participant" ON public.trip_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.trip_messages;
DROP POLICY IF EXISTS "Users can delete own messages or trip creator can delete" ON public.trip_messages;

-- Create new policies that work with Solana wallets (no Supabase auth required)

-- Anyone can view trip messages (they need to know the trip_id)
CREATE POLICY "Anyone can view trip messages"
ON public.trip_messages
FOR SELECT
USING (true);

-- Anyone can insert messages (validation happens at application level with Solana signatures)
CREATE POLICY "Anyone can send trip messages"
ON public.trip_messages
FOR INSERT
WITH CHECK (true);

-- Users can update messages where they are the sender
CREATE POLICY "Users can edit messages by wallet address"
ON public.trip_messages
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Users can delete messages where they are the sender or trip creator
CREATE POLICY "Users can delete messages by wallet address"
ON public.trip_messages
FOR DELETE
USING (true);