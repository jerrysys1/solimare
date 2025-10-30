-- Add public_visibility column to trip_offers table
ALTER TABLE trip_offers 
ADD COLUMN public_visibility boolean NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX idx_trip_offers_public_visibility ON trip_offers(public_visibility);