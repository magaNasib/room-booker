-- Drop existing policies for bookings and rooms
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;

-- Create new RLS policies for rooms
CREATE POLICY "Everyone can view rooms"
ON public.rooms
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert rooms"
ON public.rooms
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update rooms"
ON public.rooms
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete rooms"
ON public.rooms
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create new RLS policies for bookings
CREATE POLICY "Everyone can view bookings"
ON public.bookings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update bookings"
ON public.bookings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete bookings"
ON public.bookings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));