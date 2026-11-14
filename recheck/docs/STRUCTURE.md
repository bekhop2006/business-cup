# Structure

## Stack

| Part | Choice | Notes |
| --- | --- | --- |
| App | Next.js (App Router) + TypeScript, strict mode | One codebase for UI and server |
| Styling | Tailwind CSS | |
| Database, auth, file storage | Supabase (Postgres, Auth, Storage) | Can be replaced with Railway Postgres + Auth.js + a Railway volume; decide in stage 0 and do not change later |
| Document reading and text generation | LLM API with image/PDF input and structured output | Provider is isolated in `src/lib/llm/client.ts` |
| Validation | Zod | Shared schemas for LLM output, API input, UI |
| Payments | Stripe, test mode | |
| Email (reminders, optional inbound) | Transactional email provider with inbound parsing | Inbound is optional, see stage 6 |
| Hosting | Railway (Hobby plan) | Long-running server, no function timeout; deploy from GitHub |
| Tests | Vitest | Required for `src/lib/checks/` |

## Folder layout

```
.
├── AGENTS.md                 # entry point for coding agents
├── CLAUDE.md                 # imports AGENTS.md
├── README.md                 # for judges: what it is, how to run, live link
├── .env.example              # every env var, no values
├── docs/
│   ├── PROJECT.md
│   ├── STRUCTURE.md
│   ├── PLAN.md
│   └── RULES.md
├── fixtures/                 # sample bills and EOBs for tests and demo seed only (see fixtures/README.md)
├── supabase/
│   └── migrations/           # SQL migrations, never edited after being applied
├── scripts/
│   ├── seed.ts               # loads fixtures through the real pipeline
│   ├── check-extraction.ts   # runs fixtures through extraction, compares with fixtures/expected.json
│   └── fixtures/make_fixtures.py  # renders the synthetic fixtures
├── tests/
│   └── checks/               # unit tests for every check
└── src/
    ├── app/
    │   ├── page.tsx                      # landing page
    │   ├── (auth)/login/page.tsx
    │   ├── (app)/
    │   │   ├── layout.tsx                # authenticated shell
    │   │   ├── visits/page.tsx           # visit feed
    │   │   ├── visits/[id]/page.tsx      # visit card: documents, lines, flags, actions
    │   │   ├── upload/page.tsx
    │   │   ├── documents/[id]/page.tsx   # one document: reading progress, lines, needs_review correction
    │   │   ├── dashboard/page.tsx        # yearly picture
    │   │   └── billing/page.tsx          # subscription
    │   └── api/
    │       ├── documents/route.ts                 # POST upload
    │       ├── documents/[id]/process/route.ts    # run the pipeline again (retry)
    │       ├── visits/[id]/dispute/route.ts       # generate letter and call script
    │       ├── inbound-email/route.ts             # optional, stage 6
    │       ├── cron/reminders/route.ts
    │       └── stripe/webhook/route.ts
    ├── components/           # UI components, no business logic
    └── lib/
        ├── llm/
        │   ├── client.ts     # the only file that talks to the LLM provider
        │   ├── extract.ts    # document -> ExtractedDocument
        │   ├── explain.ts    # line items + flags -> plain-language text
        │   ├── dispute.ts    # visit + flags -> letter and call script
        │   └── prompts/      # prompt text, one file per task
        ├── schemas/          # Zod schemas and inferred types
        ├── checks/           # pure functions, one file per check, index.ts runs all
        ├── visits/
        │   ├── match.ts      # attach a document to a visit or create one
        │   └── totals.ts     # billed / insurance paid / patient owes
        ├── documents/        # pure document logic: validation, review input, status labels
        ├── pipeline.ts       # orchestrates the steps below
        ├── db/               # typed queries; admin.ts is the service-role client for background work
        ├── money.ts          # cents <-> display
        └── env.ts            # validated environment variables
```

## Document pipeline

Implemented in `src/lib/pipeline.ts`. Each step is a separate function so it can be tested and retried.

1. **Store.** Save the file to storage. Create a `documents` row with status `uploaded`.
2. **Extract.** Send the file to the LLM. Receive `ExtractedDocument`: type, provider, dates, line items, totals. Status `processing`.
3. **Validate.** Parse with Zod. Check that line items add up to the stated total. On failure set status `needs_review` and show the extracted lines to the user for correction.
4. **Match.** Find a visit with the same provider and service date (same family member). Attach the document or create a new visit.
5. **Check.** Run every function in `src/lib/checks/` on the visit. Replace the visit's flags with the result.
6. **Explain.** Ask the LLM for a plain-language explanation of each line and each flag. The LLM receives the flags; it does not create them.
7. **Total.** Recompute visit totals in code. Status `parsed`.

Dispute letter and call script are generated on demand from the visit and its flags.

Processing runs in the background. The UI polls document status and shows progress.

How it is built: the upload route stores the file and the row with the user's session, then starts the pipeline with Next.js `after()`. The pipeline has no session, so it uses the service-role client (`src/lib/db/admin.ts`) and filters every query by `user_id`. The LLM copies amounts as printed (`"$1,450.00"`); `src/lib/money.ts` turns them into cents. A document goes to `needs_review` when it is unreadable, an amount cannot be read, or the lines do not add up to the printed total. On the review screen the person confirms or fixes the lines; a confirmed total mismatch is later reported by the `total_mismatch` check.

## Data model

All money columns are integer cents. All tables have `id uuid`, `created_at`, and `user_id` with row-level security: a user reads and writes only their own rows.

| Table | Key columns |
| --- | --- |
| `profiles` | `user_id`, `email`, `inbound_alias`, `stripe_customer_id`, `plan` |
| `family_members` | `name`, `relation` |
| `insurance_plans` | `year`, `deductible_cents`, `oop_max_cents` |
| `visits` | `family_member_id`, `provider_name`, `service_date`, `status`, `billed_cents`, `insurance_paid_cents`, `patient_owes_cents` |
| `documents` | `visit_id`, `type`, `source`, `storage_path`, `file_name`, `mime_type`, `status`, `extracted` (jsonb), `stated_total_cents` |
| `line_items` | `document_id`, `position`, `code`, `description`, `plain_explanation`, `service_date`, `quantity`, `amount_cents` |

Files live in the private Storage bucket `documents` under `<user id>/<document id>.<ext>`; storage policies limit each user to their own folder.
| `flags` | `visit_id`, `document_id`, `line_item_id`, `type`, `message`, `potential_savings_cents` |
| `disputes` | `visit_id`, `status`, `letter_text`, `call_script`, `next_action_at` |

Enumerations:

- `documents.type`: `bill`, `eob`, `receipt`, `other`
- `documents.source`: `upload`, `email`
- `documents.status`: `uploaded`, `processing`, `parsed`, `needs_review`, `failed`
- `visits.status`: `waiting_for_insurance`, `to_pay`, `disputing`, `closed`
- `flags.type`: `duplicate_line`, `eob_mismatch`, `billed_before_insurance`, `unclear_line`, `total_mismatch`
- `disputes.status`: `draft`, `sent`, `waiting`, `resolved`

## Checks

Each check is a pure function: `(visit, documents, lineItems) => Flag[]`. No network, no database, no LLM.

| File | Flag type | Logic |
| --- | --- | --- |
| `duplicates.ts` | `duplicate_line` | Same code, date and amount appears more than once within a visit |
| `eobMismatch.ts` | `eob_mismatch` | Patient responsibility on the bill differs from the EOB |
| `billedBeforeInsurance.ts` | `billed_before_insurance` | A bill exists for the visit and no EOB is attached |
| `unclearLine.ts` | `unclear_line` | Line has no code and no usable description |
| `totals.ts` | `total_mismatch` | Line items do not add up to the stated total |

## Environment variables

Listed in `.env.example`, validated in `src/lib/env.ts`. The app fails at start if one is missing. Variables for features that are not built yet stay optional until the commit that starts using them.

```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LLM_API_KEY=
LLM_MODEL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EMAIL_API_KEY=
INBOUND_EMAIL_SECRET=
CRON_SECRET=
APP_URL=
```
