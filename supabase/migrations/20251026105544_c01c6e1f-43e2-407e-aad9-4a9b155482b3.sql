-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create trip_offers table
CREATE TABLE public.trip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE POLICY "Users can view all trip offers"
  ON public.trip_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own trip offers"
  ON public.trip_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trip offers"
  ON public.trip_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trip offers"
  ON public.trip_offers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trip_companions table (many-to-many)
CREATE TABLE public.trip_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trip_offers(id) ON DELETE CASCADE,
  companion_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(trip_id, companion_user_id)
);

-- Enable RLS on trip_companions
ALTER TABLE public.trip_companions ENABLE ROW LEVEL SECURITY;

-- Trip companions policies
CREATE POLICY "Users can view trip companions"
  ON public.trip_companions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trip owners can manage companions"
  ON public.trip_companions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_offers
      WHERE trip_offers.id = trip_companions.trip_id
      AND trip_offers.user_id = auth.uid()
    )
  );

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_offers_updated_at
  BEFORE UPDATE ON public.trip_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();