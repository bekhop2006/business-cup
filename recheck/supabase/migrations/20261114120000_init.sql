-- Recheck initial schema.
-- Money is integer cents (bigint). Every row belongs to one user and is
-- protected by row-level security. Child rows reference their parent together
-- with user_id, so a row can never point at another user's data.

create type public.subscription_plan as enum ('free', 'paid');
create type public.document_type as enum ('bill', 'eob', 'receipt', 'other');
create type public.document_source as enum ('upload', 'email');
create type public.document_status as enum ('uploaded', 'processing', 'parsed', 'needs_review', 'failed');
create type public.visit_status as enum ('waiting_for_insurance', 'to_pay', 'disputing', 'closed');
create type public.flag_type as enum ('duplicate_line', 'eob_mismatch', 'billed_before_insurance', 'unclear_line', 'total_mismatch');
create type public.dispute_status as enum ('draft', 'sent', 'waiting', 'resolved');

-- Tables -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  inbound_alias text not null unique,
  stripe_customer_id text unique,
  plan public.subscription_plan not null default 'free'
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  relation text,
  unique (id, user_id)
);

create table public.insurance_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  deductible_cents bigint not null check (deductible_cents >= 0),
  oop_max_cents bigint not null check (oop_max_cents >= 0),
  unique (user_id, year)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  family_member_id uuid,
  provider_name text not null,
  service_date date not null,
  status public.visit_status not null default 'waiting_for_insurance',
  billed_cents bigint not null default 0,
  insurance_paid_cents bigint not null default 0,
  patient_owes_cents bigint not null default 0,
  unique (id, user_id),
  foreign key (family_member_id, user_id)
    references public.family_members (id, user_id) on delete set null (family_member_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visit_id uuid,
  type public.document_type, -- unknown until extraction
  source public.document_source not null default 'upload',
  storage_path text not null unique,
  status public.document_status not null default 'uploaded',
  extracted jsonb,
  stated_total_cents bigint,
  unique (id, user_id),
  foreign key (visit_id, user_id)
    references public.visits (id, user_id) on delete set null (visit_id)
);

create table public.line_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null,
  code text,
  description text,
  plain_explanation text,
  service_date date,
  quantity integer,
  amount_cents bigint not null,
  unique (id, user_id),
  foreign key (document_id, user_id)
    references public.documents (id, user_id) on delete cascade
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visit_id uuid not null,
  document_id uuid,
  line_item_id uuid,
  type public.flag_type not null,
  message text not null,
  potential_savings_cents bigint not null default 0 check (potential_savings_cents >= 0),
  -- Every flag must point at the line or document it is about.
  check (document_id is not null or line_item_id is not null),
  foreign key (visit_id, user_id)
    references public.visits (id, user_id) on delete cascade,
  foreign key (document_id, user_id)
    references public.documents (id, user_id) on delete cascade,
  foreign key (line_item_id, user_id)
    references public.line_items (id, user_id) on delete cascade
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visit_id uuid not null,
  status public.dispute_status not null default 'draft',
  letter_text text,
  call_script text,
  next_action_at timestamptz,
  foreign key (visit_id, user_id)
    references public.visits (id, user_id) on delete cascade
);

-- Indexes ------------------------------------------------------------------

create index on public.family_members (user_id);
create index on public.visits (user_id, service_date desc);
create index on public.visits (family_member_id);
create index on public.documents (user_id);
create index on public.documents (visit_id);
create index on public.line_items (user_id);
create index on public.line_items (document_id);
create index on public.flags (user_id);
create index on public.flags (visit_id);
create index on public.flags (document_id);
create index on public.flags (line_item_id);
create index on public.disputes (user_id);
create index on public.disputes (visit_id);

-- Row-level security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.insurance_plans enable row level security;
alter table public.visits enable row level security;
alter table public.documents enable row level security;
alter table public.line_items enable row level security;
alter table public.flags enable row level security;
alter table public.disputes enable row level security;

-- Profiles are created by the trigger below and changed only by the server
-- (for example the Stripe webhook), so users can read but not write them.
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users manage their own family members" on public.family_members
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own insurance plans" on public.insurance_plans
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own visits" on public.visits
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own documents" on public.documents
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own line items" on public.line_items
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own flags" on public.flags
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own disputes" on public.disputes
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Table privileges: signed-out visitors get nothing, signed-in users get
-- plain CRUD (rows are still filtered by the policies above).

revoke all on
  public.profiles, public.family_members, public.insurance_plans, public.visits,
  public.documents, public.line_items, public.flags, public.disputes
  from anon, authenticated;

grant select on public.profiles to authenticated;

grant select, insert, update, delete on
  public.family_members, public.insurance_plans, public.visits,
  public.documents, public.line_items, public.flags, public.disputes
  to authenticated;

grant all on
  public.profiles, public.family_members, public.insurance_plans, public.visits,
  public.documents, public.line_items, public.flags, public.disputes
  to service_role;

-- Profile for every new user -------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, inbound_alias)
  values (new.id, new.email, substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
