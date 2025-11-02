-- Fix function search path for prevent_booking_overlap
create or replace function public.prevent_booking_overlap()
returns trigger
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Validate time order
  if NEW.start_time >= NEW.end_time then
    raise exception 'end_time must be after start_time' using errcode = '22007';
  end if;

  -- Prevent overlaps in the same room (inclusive start, exclusive end)
  if exists (
    select 1
    from public.bookings b
    where b.room_id = NEW.room_id
      and b.id is distinct from NEW.id
      and tstzrange(b.start_time, b.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) then
    raise exception 'Booking overlaps with an existing booking for this room' using errcode = '23P01';
  end if;

  return NEW;
end;
$$;