-- Prevent overlapping bookings and invalid times via trigger-based validation
-- 1) Helper function (optional) not needed; directly in trigger

create or replace function public.prevent_booking_overlap()
returns trigger as $$
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
$$ language plpgsql;

-- 2) Trigger
 drop trigger if exists trg_prevent_booking_overlap on public.bookings;
create trigger trg_prevent_booking_overlap
before insert or update on public.bookings
for each row execute function public.prevent_booking_overlap();

-- 3) Optional performance index on time range for overlap checks
create index if not exists bookings_time_gist on public.bookings using gist (tstzrange(start_time, end_time, '[)'));
