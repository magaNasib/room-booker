-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create squads table
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap CHECK (start_time < end_time)
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create public read policies (anyone can view)
CREATE POLICY "Anyone can view rooms"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view squads"
  ON public.squads FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view bookings"
  ON public.bookings FOR SELECT
  USING (true);

-- Create public write policies (anyone can book)
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update bookings"
  ON public.bookings FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete bookings"
  ON public.bookings FOR DELETE
  USING (true);

-- Insert 3 rooms
INSERT INTO public.rooms (name, description, color) VALUES
  ('Room Alpha', 'Main conference room with projector', '#3B82F6'),
  ('Room Beta', 'Quiet meeting space for small groups', '#10B981'),
  ('Room Gamma', 'Creative space with whiteboard', '#F59E0B');

-- Insert 10 squads
INSERT INTO public.squads (name) VALUES
  ('Squad 1'),
  ('Squad 2'),
  ('Squad 3'),
  ('Squad 4'),
  ('Squad 5'),
  ('Squad 6'),
  ('Squad 7'),
  ('Squad 8'),
  ('Squad 9'),
  ('Squad 10');

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;