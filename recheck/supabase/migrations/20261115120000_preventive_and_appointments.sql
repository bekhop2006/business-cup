-- Free preventive care and appointments the person books themselves.

-- What the preventive care list depends on. All optional; users may edit them.
alter table public.profiles
  add column birth_year smallint check (birth_year is null or birth_year between 1900 and 2100),
  add column sex text check (sex is null or sex in ('female', 'male')),
  add column tb_risk boolean;

grant update (birth_year, sex, tb_risk) on public.profiles to authenticated;

-- When the person last had each preventive service. A missing row means
-- "not yet" or "not sure". Which services apply and when they are due next
-- is computed by code in src/lib/preventive/.
create table public.preventive_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  service_id text not null check (service_id ~ '^[a-z0-9_]{1,40}$'),
  last_done_on date not null,
  -- Which test, when the interval depends on it (e.g. colonoscopy vs stool test).
  method text check (method is null or method ~ '^[a-z0-9_]{1,40}$'),
  updated_at timestamptz not null default now(),
  unique (user_id, service_id)
);

alter table public.preventive_records enable row level security;

create policy "Users manage their own preventive records" on public.preventive_records
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.preventive_records from anon, authenticated;
grant select, insert, update, delete on public.preventive_records to authenticated;
grant all on public.preventive_records to service_role;

-- Recheck never books on the person's behalf: they call or email the clinic
-- and record the date here.
alter table public.care_cases
  add column appointment_at timestamptz,
  add column appointment_status text check (appointment_status in ('planned', 'done', 'cancelled'));
