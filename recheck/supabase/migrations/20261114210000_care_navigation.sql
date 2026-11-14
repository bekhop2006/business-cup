-- Care navigation (before the visit): the person's details, a reusable
-- insurance profile, and the cases they ask about with the providers found.

-- About the person. Users may edit only these columns; the plan and billing
-- columns stay writable by the server only.
alter table public.profiles
  add column full_name text check (full_name is null or length(btrim(full_name)) between 1 and 100),
  add column zip_code text check (zip_code is null or zip_code ~ '^[0-9]{5}$'),
  add column household_size integer check (household_size is null or household_size between 1 and 20),
  add column onboarded_at timestamptz;

grant update (full_name, zip_code, household_size, onboarded_at) on public.profiles to authenticated;

create policy "Users update their own profile details" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The insurance profile. Every amount is optional: people often don't know them.
alter table public.insurance_plans
  alter column deductible_cents drop not null,
  alter column oop_max_cents drop not null,
  add column insurer_name text check (insurer_name is null or length(insurer_name) <= 100),
  add column plan_name text check (plan_name is null or length(plan_name) <= 100),
  add column plan_type text check (plan_type in ('PPO', 'HMO', 'EPO', 'POS', 'HDHP', 'other')),
  add column deductible_met_cents bigint check (deductible_met_cents >= 0),
  add column oop_met_cents bigint check (oop_met_cents >= 0),
  add column coinsurance_bps integer check (coinsurance_bps between 0 and 10000),
  add column copay_primary_cents bigint check (copay_primary_cents >= 0),
  add column copay_specialist_cents bigint check (copay_specialist_cents >= 0),
  add column copay_urgent_care_cents bigint check (copay_urgent_care_cents >= 0),
  add column copay_er_cents bigint check (copay_er_cents >= 0),
  add column updated_at timestamptz not null default now();

create type public.care_urgency as enum ('emergency', 'urgent', 'routine');

create table public.care_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(btrim(description)) between 1 and 2000),
  summary text,
  body_area text,
  warning_answers jsonb,
  urgency public.care_urgency,
  route text,
  chosen_provider jsonb,
  estimate jsonb, -- snapshot of the forecast with its sources and assumptions
  estimated_savings_cents bigint check (estimated_savings_cents >= 0),
  unique (id, user_id)
);

-- Providers found for a case, kept with their data source. Insurance network
-- participation is never verified by Recheck.
create table public.case_providers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  case_id uuid not null,
  route text not null,
  source text not null check (source in ('google_places', 'npi_registry')),
  external_id text not null,
  name text not null,
  address text,
  phone text,
  website text,
  rating numeric(2, 1),
  rating_count integer,
  distance_meters integer,
  maps_url text,
  network_status text not null default 'not_verified' check (network_status = 'not_verified'),
  unique (case_id, route, source, external_id),
  foreign key (case_id, user_id)
    references public.care_cases (id, user_id) on delete cascade
);

create index on public.care_cases (user_id, created_at desc);
create index on public.case_providers (user_id);
create index on public.case_providers (case_id);

alter table public.care_cases enable row level security;
alter table public.case_providers enable row level security;

create policy "Users manage their own care cases" on public.care_cases
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own case providers" on public.case_providers
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.care_cases, public.case_providers from anon, authenticated;
grant select, insert, update, delete on public.care_cases, public.case_providers to authenticated;
grant all on public.care_cases, public.case_providers to service_role;
