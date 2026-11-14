-- Document fields used to group documents into visits and to total them.
-- They are filled from the extraction, or by the person on the review screen;
-- documents.extracted keeps the raw LLM output.

alter table public.documents
  add column provider_name text,
  add column patient_name text,
  add column service_date date,
  add column insurance_paid_cents bigint check (insurance_paid_cents >= 0),
  add column patient_responsibility_cents bigint;

-- One-time backfill for documents read before these columns existed. Amounts
-- on those documents are plain dollar figures such as "$1,189.60".
update public.documents
set
  provider_name = nullif(btrim(extracted->>'provider_name'), ''),
  patient_name = nullif(btrim(extracted->>'patient_name'), ''),
  service_date = (extracted->>'service_date')::date,
  insurance_paid_cents =
    round(nullif(regexp_replace(extracted->>'insurance_paid', '[^0-9.]', '', 'g'), '')::numeric * 100)::bigint,
  patient_responsibility_cents =
    round(nullif(regexp_replace(extracted->>'patient_responsibility', '[^0-9.]', '', 'g'), '')::numeric * 100)::bigint
where extracted is not null and (extracted->>'readable')::boolean;

create index on public.documents (user_id, service_date);

-- A family member is created once per name, whatever the letter case.
create unique index family_members_user_name_key on public.family_members (user_id, lower(name));
