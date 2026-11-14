# 24-hour plan

Work through the stages in order. A stage is finished only when its "Done when" line is true **on the deployed app**, not only locally.

**Current stage:** 3

Update the line above when a stage is finished.

## Priorities

If time runs short, cut from the bottom of this list, never from the top:

1. Upload → extraction → visit card with real numbers
2. Checks and flags tied to line items
3. Plain-language explanations, dispute letter, call script
4. Yearly dashboard
5. Stripe subscription
6. Reminders
7. Inbound email

## Stage 0 — Foundation (hours 0–2)

- [x] Create the Next.js + TypeScript project, strict mode, Tailwind, ESLint, Vitest
- [x] Add `npm run typecheck`, `lint`, `test` scripts
- [x] Decide database/auth/storage option (see `STRUCTURE.md`) and write it down here: **Supabase** (Postgres, Auth with email + password, Storage). "Confirm email" is off in Supabase Auth so sign-up logs in at once. Next.js Cache Components are off: every app page reads the session.
- [x] First migration: all tables from `STRUCTURE.md` with row-level security
- [x] Email login works
- [x] `src/lib/env.ts` and `.env.example`
- [x] Deploy to Railway from GitHub, environment variables set (root directory `/recheck`, production URL https://business-cup-production.up.railway.app)

**Done when:** a logged-in user sees an empty visits page at the production URL.

## Stage 1 — Extraction (hours 2–7)

- [x] Collect 5–6 sample bills and EOBs in `fixtures/`, some with planted errors
- [x] `ExtractedDocument` Zod schema
- [x] `src/lib/llm/client.ts` and `extract.ts` with the extraction prompt
- [x] Upload page: drag and drop, phone camera, PDF and images
- [x] `POST /api/documents` stores the file and creates the row
- [x] Pipeline steps 1–3: store, extract, validate
- [x] Background processing with status polling in the UI
- [x] `needs_review` screen: show extracted lines, allow manual correction

**Done when:** uploading each fixture on production produces correct line items in the database, and a blurry photo ends in `needs_review` instead of an error.

## Stage 2 — Visits (hours 7–11)

- [x] `visits/match.ts`: attach by provider and service date, or create
- [x] `visits/totals.ts`: billed, insurance paid, patient owes
- [x] Visit feed grouped by family member, with status and amount owed
- [x] Visit card: documents, line items, totals
- [x] Add and pick family members
- [x] Empty, loading and error states

**Done when:** a bill and its EOB uploaded separately land in the same visit, and the three totals are correct.

## Stage 3 — Checks and actions (hours 11–15)

- [ ] All five checks in `src/lib/checks/`, each with unit tests
- [ ] Flags shown on the visit card next to their line, with potential savings
- [ ] `explain.ts`: plain-language text for lines and flags
- [ ] `dispute.ts`: dispute letter and phone script from the visit's flags
- [ ] Copy and download buttons for the letter
- [ ] "Not legal or medical advice" notice

**Done when:** the fixture with a duplicate line and the fixture with an EOB mismatch both produce the right flag, a readable explanation and a usable letter on production.

**Checkpoint:** the core product works. Everything after this is an improvement.

## Stage 4 — Yearly dashboard and payment (hours 15–18)

- [ ] Insurance plan form: deductible and out-of-pocket maximum
- [ ] Dashboard: spent this year, deductible progress, owed now, saved
- [ ] Stripe test-mode subscription and webhook
- [ ] Paywall: first check free; letters, scripts and dashboard on the paid plan
- [ ] Landing page with the tagline and a clear call to action

**Done when:** a new user can sign up, check one bill for free, hit the paywall, pay with a Stripe test card and open the letter.

## Stage 5 — Hardening (hours 18–21)

- [ ] Run every fixture again on production; fix extraction misses
- [ ] Large files, wrong file types, multi-page PDFs, LLM failures and timeouts handled
- [ ] Responsive layout checked on a phone browser
- [ ] "Delete all my data" works
- [ ] No document contents in logs

**Done when:** three people outside the build can complete upload → flag → letter without help.

## Stage 6 — Optional extras (only if stages 0–5 are finished)

- [ ] Dispute tracker: status and next-action date
- [ ] Reminder emails from `api/cron/reminders`
- [ ] Inbound email: personal forwarding address, webhook, attachments into the same pipeline
- [ ] Emails without attachments create a "download and upload your bill" placeholder visit

## Stage 7 — Submission (hours 21–24)

- [ ] `README.md`: what it is, live link, test account, how to run, architecture in five lines
- [ ] Remove dead code, unused dependencies, stray console output
- [ ] Demo account seeded through the real pipeline with `scripts/seed.ts`
- [ ] All submission items prepared (list them here once confirmed): ______
- [ ] Demo rehearsed twice end-to-end on production
- [ ] Feature freeze at hour 22: bug fixes only

**Done when:** everything is submitted and the production app has been clicked through after the last deploy.
