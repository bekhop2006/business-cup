-- flags.message is written by the check that found the problem;
-- flags.explanation is the plain-language explanation written by the LLM.
alter table public.flags add column explanation text;

-- One dispute draft per visit.
create unique index disputes_visit_key on public.disputes (visit_id);
