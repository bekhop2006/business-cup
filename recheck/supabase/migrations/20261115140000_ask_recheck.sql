-- "Ask Recheck": answers from official documents (knowledge/*.md), retrieved
-- with pgvector. The documents are public; questions are never stored.

create extension if not exists vector with schema extensions;

-- Chunks of official documents with their source. Written only by
-- scripts/build-knowledge.ts with the service role.
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_id text not null check (source_id ~ '^[a-z0-9-]{1,80}$'),
  title text not null,
  url text not null check (url ~ '^https://'),
  jurisdiction text not null check (jurisdiction in ('federal', 'california')),
  publisher text not null,
  checked_on date not null,
  position integer not null check (position >= 0),
  content text not null check (length(content) between 1 and 4000),
  embedding extensions.vector(1536) not null,
  unique (source_id, position)
);

alter table public.knowledge_chunks enable row level security;

create policy "Signed-in users read the knowledge base" on public.knowledge_chunks
  for select to authenticated using (true);

revoke all on public.knowledge_chunks from anon, authenticated;
grant select on public.knowledge_chunks to authenticated;
grant all on public.knowledge_chunks to service_role;

-- The closest chunks to a question, by cosine distance, optionally from one
-- jurisdiction only (so California rules are not crowded out by federal ones).
create function public.match_knowledge(
  query_embedding extensions.vector(1536),
  match_count integer,
  only_jurisdiction text default null
)
returns table (
  id uuid, source_id text, title text, url text, jurisdiction text, publisher text,
  checked_on date, content text, distance double precision
)
language sql stable
set search_path = public, extensions
as $$
  select id, source_id, title, url, jurisdiction, publisher, checked_on, content,
         embedding <=> query_embedding as distance
  from public.knowledge_chunks
  where only_jurisdiction is null or jurisdiction = only_jurisdiction
  order by embedding <=> query_embedding
  limit least(greatest(match_count, 1), 10);
$$;

revoke execute on function public.match_knowledge(extensions.vector, integer, text) from public, anon;
grant execute on function public.match_knowledge(extensions.vector, integer, text) to authenticated, service_role;

-- One row per question asked, without its text, to apply the free limit.
create table public.ask_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade
);

create index on public.ask_log (user_id);

alter table public.ask_log enable row level security;

create policy "Users manage their own ask log" on public.ask_log
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.ask_log from anon, authenticated;
grant select, insert on public.ask_log to authenticated;
grant all on public.ask_log to service_role;
