-- Add explicit booking urgency for deterministic dynamic pricing signals.
alter table public.bookings
  add column if not exists urgency text;

-- Backfill only when null using safe deterministic defaults from current date/time.
update public.bookings
set urgency = case
  when service_date is null then 'scheduled'
  when service_date > current_date then 'scheduled'
  when service_date = current_date then 'same_day'
  else 'asap'
end
where urgency is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_urgency_check'
  ) then
    alter table public.bookings
      add constraint bookings_urgency_check
      check (urgency in ('scheduled', 'same_day', 'asap'));
  end if;
end $$;
