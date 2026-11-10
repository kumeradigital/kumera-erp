-- Additive operating schedule for automatic monthly open-day calculations.
-- Existing businesses keep their current manual operating-day setting.

alter table public.business_locations
  add column if not exists operating_days_mode text not null default 'manual',
  add column if not exists operating_weekdays smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  add column if not exists opening_time time,
  add column if not exists closing_time time;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_locations_operating_days_mode_check'
      and conrelid = 'public.business_locations'::regclass
  ) then
    alter table public.business_locations
      add constraint business_locations_operating_days_mode_check
      check (operating_days_mode in ('manual','weekly')) not valid;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_locations_operating_weekdays_check'
      and conrelid = 'public.business_locations'::regclass
  ) then
    alter table public.business_locations
      add constraint business_locations_operating_weekdays_check
      check (
        cardinality(operating_weekdays) between 1 and 7
        and operating_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
      ) not valid;
  end if;
end $$;

comment on column public.business_locations.operating_days_mode is
  'manual conserva cost_settings.operating_days_month; weekly calcula días desde operating_weekdays';
comment on column public.business_locations.operating_weekdays is
  'Días ISO: lunes=1 a domingo=7';
