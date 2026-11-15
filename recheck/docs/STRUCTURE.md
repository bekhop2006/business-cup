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
│   ├── RULES.md
│   └── design/prototype.html # static UI prototype; not part of the app
├── fixtures/                 # sample bills and EOBs for tests and demo seed only (see fixtures/README.md)
├── supabase/
│   └── migrations/           # SQL migrations, never edited after being applied
├── scripts/
│   ├── check-extraction.ts   # runs fixtures through extraction, compares with fixtures/expected.json
│   ├── check-providers.ts    # live smoke check of Google Places and the NPI Registry near 78701
│   ├── refresh-visits.ts     # recomputes totals, flags and explanations for every visit
│   └── fixtures/make_fixtures.py  # renders the synthetic fixtures
├── tests/
│   └── checks/               # unit tests for every check
└── src/
    ├── app/
    │   ├── page.tsx                      # landing page
    │   ├── (auth)/login/page.tsx
    │   ├── (app)/
    │   │   ├── layout.tsx                # authenticated shell
    │   │   ├── home/page.tsx             # start page: describe a problem, insurance overview, savings, recent cases
    │   │   ├── onboarding/page.tsx       # about you → your insurance → summary; new users land here
    │   │   ├── profile/page.tsx          # edit the same details later
    │   │   ├── care/new/page.tsx         # describe a health need
    │   │   ├── care/[id]/page.tsx        # safety questions → care options → providers and costs → checklist
    │   │   ├── visits/page.tsx           # bills: visit feed
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
    │       ├── billing/checkout/route.ts          # start a Stripe Checkout for the paid plan
    │       ├── billing/confirm/route.ts           # return from Checkout, confirm and upgrade
    │       └── stripe/webhook/route.ts            # signed Stripe events keep the plan in sync
    ├── components/           # UI components, no business logic
    └── lib/
        ├── care/
        │   ├── safety.ts     # fixed warning signs and deterministic urgency
        │   └── routes.ts     # care options: primary care, sports medicine, urgent care, ER, with CPT codes
        ├── costs/
        │   ├── benchmarks.ts # real CMS fee schedule amounts with source and year
        │   ├── patientShare.ts  # the person's share from their own plan (copay, deductible, coinsurance, OOP)
        │   └── scenarios.ts  # visit / + X-ray / + MRI forecasts
        ├── providers/        # Google Places search, NPI Registry fallback, distance
        ├── preventive/       # USPSTF/CDC preventive services, who they apply to, when due
        ├── llm/
        │   ├── client.ts     # the only file that talks to the LLM provider
        │   ├── extract.ts    # document -> ExtractedDocument
        │   ├── explain.ts    # line items + flags -> plain-language text
        │   ├── dispute.ts    # visit + flags -> letter and call script
        │   ├── intake.ts     # care description -> validated summary and suggestions; never urgency
        │   └── prompts/      # prompt text, one file per task
        ├── schemas/          # Zod schemas and inferred types
        ├── checks/           # pure functions, one file per check, index.ts runs all
        ├── billing/
        │   ├── plan.ts       # what the free and paid plans include
        │   └── stripe.ts     # the only file that talks to Stripe
        ├── dashboard/yearly.ts  # the yearly picture, computed from visits
        ├── dashboard/home.ts    # estimated savings from care choices, for the home page
        ├── visits/
        │   ├── match.ts      # pure rules: same provider, same person, matching visit
        │   ├── attach.ts     # attach a document to a visit or create one, then recompute totals
        │   └── totals.ts     # billed / insurance paid / patient owes
        ├── documents/        # pure document logic: validation, review input, status labels
        ├── pipeline.ts       # orchestrates the steps below
        ├── db/               # typed queries; admin.ts is the service-role client for background work
        ├── money.ts          # cents <-> display
        └── env.ts            # validated environment variables
```

Care cases keep the validated intake and confirmed safety answers separately in `warning_answers`. Urgency is recomputed from the confirmed answers, including when a case is reopened. An unavailable intake does not block safety questions. The current questions and imaging scenarios cover knee/leg pain; other health needs show the scope limit instead of unrelated estimates.

Provider searches are explicit server actions. Only ZIP and fixed care-type queries go to Google Places/NPI, never the symptom description or insurance profile. Results are stored in `case_providers`; `warning_answers.provider_searches` records each route's ZIP, source, time, status and active result IDs. A UUID revision guards context writes and provider selection against concurrent safety edits or searches. Search conflicts merge the latest context once. Reopening a case reads saved results without calling the directories again.

Choosing a provider saves its directory snapshot in `chosen_provider`, the calculation's insurance values, all three cost scenarios and their CMS/KFF sources in `estimate`, and conservative estimated savings in `estimated_savings_cents`. Savings compare the selected care type's visit-only upper estimate with urgent care's lower estimate under the same profile; overlapping ranges count as zero. They never compare invented clinic prices. Saved estimates remain unchanged when the profile changes. A new search keeps the clearly labeled saved choice until the person explicitly chooses another provider; saving new safety answers clears the choice. Call-checklist checkmarks are local to the page and are not saved.

## Document pipeline

Implemented in `src/lib/pipeline.ts`. Each step is a separate function so it can be tested and retried.

1. **Store.** Save the file to storage. Create a `documents` row with status `uploaded`.
2. **Extract.** Send the file to the LLM. Receive `ExtractedDocument`: type, provider, dates, line items, totals. Status `processing`.
3. **Validate.** Parse with Zod. Check that line items add up to the stated total. On failure set status `needs_review` and show the extracted lines to the user for correction.
4. **Match.** Find a visit with the same provider and service date (same family member). Attach the document or create a new visit. The family member is found or created from the patient name on the document; an unknown person matches any visit.
5. **Check.** Run every function in `src/lib/checks/` on the visit. Replace the visit's flags with the result.
6. **Explain.** Ask the LLM for a plain-language explanation of each line and each flag. The LLM receives the flags; it does not create them.
7. **Total.** Recompute visit totals in code: billed and patient owes come from the newest bill, insurance paid from the newest EOB; with only one kind of document, its own figures are used. Status `parsed`.

Dispute letter and call script are generated on demand from the visit and its flags.

Processing runs in the background. The UI polls document status and shows progress.

How it is built: the upload route stores the file and the row with the user's session, then starts the pipeline with Next.js `after()`. The pipeline has no session, so it uses the service-role client (`src/lib/db/admin.ts`) and filters every query by `user_id`. The LLM copies amounts as printed (`"$1,450.00"`); `src/lib/money.ts` turns them into cents. A document goes to `needs_review` when it is unreadable, an amount cannot be read, or the lines do not add up to the printed total. On the review screen the person confirms or fixes the lines; a confirmed total mismatch is later reported by the `total_mismatch` check.

## Data model

All money columns are integer cents. All tables have `id uuid`, `created_at`, and `user_id` with row-level security: a user reads and writes only their own rows.

| Table | Key columns |
| --- | --- |
| `profiles` | `user_id`, `email`, `inbound_alias`, `stripe_customer_id`, `plan`, `full_name`, `zip_code`, `household_size`, `onboarded_at`, `birth_year`, `sex`, `tb_risk` (users may update only the last seven) |
| `family_members` | `name` (unique per user, ignoring case), `relation` |
| `insurance_plans` | the insurance profile: `year`, `insurer_name`, `plan_name`, `plan_type`, `deductible_cents`, `deductible_met_cents`, `oop_max_cents`, `oop_met_cents`, `coinsurance_bps`, `copay_primary_cents`, `copay_specialist_cents`, `copay_urgent_care_cents`, `copay_er_cents`, `updated_at` (all amounts optional) |
| `visits` | `family_member_id`, `provider_name`, `service_date`, `status`, `billed_cents`, `insurance_paid_cents`, `patient_owes_cents` |
| `documents` | `visit_id`, `type`, `source`, `storage_path`, `file_name`, `mime_type`, `status`, `extracted` (jsonb), `stated_total_cents`, `provider_name`, `patient_name`, `service_date`, `insurance_paid_cents`, `patient_responsibility_cents` |
| `line_items` | `document_id`, `position`, `code`, `description`, `plain_explanation`, `service_date`, `quantity`, `amount_cents` |

Files live in the private Storage bucket `documents` under `<user id>/<document id>.<ext>`; storage policies limit each user to their own folder.

`documents.extracted` keeps the raw LLM output. The document columns next to it (`provider_name` … `patient_responsibility_cents`, `stated_total_cents`) are the trusted values used by matching, totals and checks: filled from the extraction, or by the person on the review screen.
| `flags` | `visit_id`, `document_id`, `line_item_id`, `type`, `message` (written by the check), `explanation` (written by the LLM), `potential_savings_cents` |
| `disputes` | `visit_id` (one per visit), `status`, `letter_text`, `call_script`, `next_action_at` |
| `care_cases` | `description`, `summary`, `body_area`, `warning_answers` (jsonb), `urgency`, `route`, `chosen_provider` (jsonb), `estimate` (jsonb snapshot with sources), `estimated_savings_cents`, `appointment_at`, `appointment_status` (`planned`, `done`, `cancelled`) |
| `knowledge_chunks` | public, no `user_id`: chunks of `knowledge/*.md` with `source_id`, `title`, `url`, `jurisdiction` (`federal`, `california`), `publisher`, `checked_on`, `content`, `embedding` (pgvector, 1536); read by signed-in users through `match_knowledge()`, written only by `scripts/build-knowledge.ts` |
| `ask_log` | one row per "Ask Recheck" question, without its text (for the free limit) |
| `preventive_records` | `service_id` (unique per user), `last_done_on`, `method` (which test, when the interval depends on it) |
| `case_providers` | `case_id`, `route`, `source` (`google_places`, `npi_registry`), `external_id`, `name`, `address`, `phone`, `website`, `rating`, `rating_count`, `distance_meters`, `maps_url`, `network_status` (always `not_verified`) |

Enumerations:

- `documents.type`: `bill`, `eob`, `receipt`, `other`
- `documents.source`: `upload`, `email`
- `documents.status`: `uploaded`, `processing`, `parsed`, `needs_review`, `failed`
- `visits.status`: `waiting_for_insurance`, `to_pay`, `disputing`, `closed`
- `flags.type`: `duplicate_line`, `eob_mismatch`, `billed_before_insurance`, `unclear_line`, `total_mismatch`
- `disputes.status`: `draft`, `sent`, `waiting`, `resolved`

## Checks

Each check is a pure function: `({ documents, lines }) => FlagDraft[]` over one visit. No network, no database, no LLM. Every flag has a `document_id`, plus a `line_item_id` when it is about one line. `potentialSavings()` in `checks/index.ts` sums a visit's savings without counting the same money twice (a duplicate line and the bill/EOB gap it causes are one overcharge) and never above what the person owes.

| File | Flag type | Logic |
| --- | --- | --- |
| `duplicates.ts` | `duplicate_line` | Same code (or description when there is no code), date and amount appears more than once on one bill |
| `eobMismatch.ts` | `eob_mismatch` | The newest bill asks the patient for more than the newest EOB's patient responsibility |
| `billedBeforeInsurance.ts` | `billed_before_insurance` | A bill exists for the visit, no EOB is attached, and the bill shows no insurance payment |
| `unclearLine.ts` | `unclear_line` | A bill line has no code and no usable description (only generic words such as "MISC SVC") |
| `totals.ts` | `total_mismatch` | A bill's line items do not add up to its stated total |

## Environment variables

Listed in `.env.example`, validated in `src/lib/env.ts`. The app fails at start if a required one is missing. `GOOGLE_PLACES_API_KEY` is optional: without it, provider search uses the CMS NPI Registry only.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LLM_API_KEY=
LLM_MODEL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_URL=
GOOGLE_PLACES_API_KEY=
```

## Plans and payments

- Free: upload and read documents, visits and totals, and the full check (flags, explanations) of the user's first visit. Other visits show how many things were found and how much is worth asking about.
- Paid (Recheck Plus, $9.99 a month, Stripe test mode): unlimited care cases with cost forecasts, every visit's flags, dispute letters and call scripts, the yearly dashboard. Safety guidance is never paywalled.
- `profiles.plan` is written only by the server: by `/api/billing/confirm` after Checkout and by the Stripe webhook (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`). The price is set in code, so no product needs to exist in Stripe.

## Care navigation (before the visit)

1. **Describe.** The person writes what is going on. `src/lib/llm/intake.ts` returns a summary, body area, suggested routes and any warning signs mentioned; nothing else.
2. **Safety.** `src/lib/care/safety.ts` asks fixed yes/no questions (pre-filled from step 1) and decides urgency in code. Any warning sign → "Get care now"; the flow stops there and is never paywalled.
3. **Options.** `src/lib/care/routes.ts` lists the care routes with what each is for and its CPT codes.
4. **Costs.** `src/lib/costs/` turns CMS benchmark amounts into a range of the person's own share using their insurance profile; every assumption and source travels with the numbers.
5. **Providers.** `src/lib/providers/` searches Google Places near the person's ZIP and falls back to the CMS NPI Registry. Results are stored in `case_providers` with their source; network status is always "not verified".
6. **Choose.** The chosen provider, the estimate snapshot and the estimated savings (vs the most expensive suitable option) are saved on the case, with a checklist of questions to ask before booking.
7. **Book.** The person calls or emails the clinic (Recheck shows the phone and a ready email from `src/lib/care/appointment.ts`) and saves the date. The home page shows the upcoming visit; `/care/[id]/appointment.ics` adds it to a calendar; after the visit the person marks it done and is sent to add the bill.

## Ask Recheck (RAG)

`knowledge/*.md` holds official pages (HealthCare.gov, CMS No Surprises Act, DOL, California DMHC) with their URL and check date in front matter. `npm run build:knowledge` chunks them (`src/lib/knowledge/documents.ts`), embeds them (`text-embedding-3-small`) and replaces `knowledge_chunks`. A question is embedded, `match_knowledge()` returns the closest excerpts (plus the closest California ones when the person's ZIP is in California), and `src/lib/llm/ask.ts` answers only from them. `src/lib/knowledge/answer.ts` keeps only the excerpts the answer cites; source links come from the database, never from the model. Symptom questions are sent to Get care; questions the sources don't cover get "I don't know". First question free, then Recheck Plus.

## Free preventive care

`src/lib/preventive/services.ts` lists USPSTF A/B screenings and CDC adult vaccines with age, sex, risk criteria, interval and source URL. `schedule.ts` decides which apply (birth year, sex, TB-risk answer) and when each is due from `preventive_records`. Shown as onboarding step 3, a profile card and a home card.
