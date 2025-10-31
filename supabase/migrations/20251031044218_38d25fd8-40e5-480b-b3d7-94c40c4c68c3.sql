-- Add booker_name column to bookings table
ALTER TABLE public.bookings ADD COLUMN booker_name TEXT;

-- Make squad_id nullable since we'll use booker_name instead
ALTER TABLE public.bookings ALTER COLUMN squad_id DROP NOT NULL;