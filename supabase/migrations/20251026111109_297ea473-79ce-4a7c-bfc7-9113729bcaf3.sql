-- Create boats table for minted NFTs
CREATE TABLE public.boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  boat_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  year_built INTEGER NOT NULL,
  length_feet INTEGER NOT NULL,
  manufacturer TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on boats
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;

-- Boats policies
CREATE POLICY "Anyone can view boats"
  ON public.boats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own boats"
  ON public.boats FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own boats"
  ON public.boats FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Users can delete own boats"
  ON public.boats FOR DELETE
  TO public
  USING (true);

-- Add boat reference to trip_offers
ALTER TABLE public.trip_offers
ADD COLUMN boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL;

-- Trigger for updated_at on boats
CREATE TRIGGER update_boats_updated_at
  BEFORE UPDATE ON public.boats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();