-- Uploaded files: each document keeps its original name and type, and the
-- files live in a private bucket under "<user id>/<document id>.<ext>".
-- Line items keep the order in which they are printed on the document.

alter table public.documents
  add column file_name text not null,
  add column mime_type text not null;

alter table public.line_items
  add column position integer not null default 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  8388608, -- 8 MB, same limit as src/lib/schemas/upload.ts
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "Users read their own document files" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload into their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own document files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
