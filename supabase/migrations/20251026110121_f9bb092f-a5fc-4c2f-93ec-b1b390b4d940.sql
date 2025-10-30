-- Drop existing tables and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.trip_companions CASCADE;
DROP TABLE IF EXISTS public.trip_offers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table using wallet address as primary key
CREATE TABLE public.profiles (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - anyone can view, only owner can update
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO public
  USING (true);

-- Create trip_offers table
CREATE TABLE public.trip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
  title TEXT NOT NULL,
  place TEXT NOT NULL,
  planner TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT valid_date_range CHECK (date_to >= date_from)
);

-- Enable RLS on trip_offers
ALTER TABLE public.trip_offers ENABLE ROW LEVEL SECURITY;

-- Trip offers policies
CREATE POLICY "Anyone can view trip offers"
  ON public.trip_offers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create trip offers"
  ON public.trip_offers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own trip offers"
  ON public.trip_offers FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Users can delete own trip offers"
  ON public.trip_offers FOR DELETE
  TO public
  USING (true);

-- Create trip_companions table
CREATE TABLE public.trip_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trip_offers(id) ON DELETE CASCADE,
  companion_wallet_address TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(trip_id, companion_wallet_address)
);

-- Enable RLS on trip_companions
ALTER TABLE public.trip_companions ENABLE ROW LEVEL SECURITY;

-- Trip companions policies
CREATE POLICY "Anyone can view trip companions"
  ON public.trip_companions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage companions"
  ON public.trip_companions FOR ALL
  TO public
  USING (true);

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_offers_updated_at
  BEFORE UPDATE ON public.trip_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();