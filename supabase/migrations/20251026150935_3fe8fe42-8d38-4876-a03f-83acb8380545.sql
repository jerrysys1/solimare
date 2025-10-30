-- Add max_crew field to trip_offers table
ALTER TABLE public.trip_offers 
ADD COLUMN max_crew integer DEFAULT 4 CHECK (max_crew > 0 AND max_crew <= 50);