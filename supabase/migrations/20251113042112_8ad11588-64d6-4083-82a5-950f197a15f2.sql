-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;

-- Create a new policy that allows everyone to view bookings
CREATE POLICY "Anyone can view bookings"
ON public.bookings
FOR SELECT
USING (true);