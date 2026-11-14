# 24-hour plan

Work through the stages in order. A stage is finished only when its "Done when" line is true **on the deployed app**, not only locally.

**Current stage:** 10

Update the line above when a stage is finished.

**Pivot at hour 12** (see `PROJECT.md`): Recheck now covers the whole visit. Stages 0–4 built the "after the visit" part (bill review, payment); stages 5–10 add "before the visit" (insurance profile, care options, real providers, cost forecast) and finish the submission.

## Priorities

If time runs short, cut from the bottom of this list, never from the top:

1. Onboarding with a reusable insurance profile
2. Care case: description → safety questions → care options
3. Cost forecast from real CMS benchmarks and the user's own plan
4. Real providers nearby with "not verified" network status
5. Home dashboard and the $9.99 plan
6. Insurance card photo extraction
7. Hardening extras (delete all data, phone polish)

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

- [x] All five checks in `src/lib/checks/`, each with unit tests
- [x] Flags shown on the visit card next to their line, with potential savings
- [x] `explain.ts`: plain-language text for lines and flags
- [x] `dispute.ts`: dispute letter and phone script from the visit's flags
- [x] Copy and download buttons for the letter
- [x] "Not legal or medical advice" notice

**Done when:** the fixture with a duplicate line and the fixture with an EOB mismatch both produce the right flag, a readable explanation and a usable letter on production.

**Checkpoint:** the core product works. Everything after this is an improvement.

## Stage 4 — Yearly dashboard and payment (hours 15–18)

- [x] Insurance plan form: deductible and out-of-pocket maximum
- [x] Dashboard: spent this year, deductible progress, owed now, saved
- [x] Stripe test-mode subscription and webhook
- [x] Paywall: first check free; letters, scripts and dashboard on the paid plan
- [x] Landing page with the tagline and a clear call to action

**Done when:** a new user can sign up, check one bill for free, hit the paywall, pay with a Stripe test card and open the letter.

## Stage 5 — Pivot foundation (~2 h)

- [x] `PROJECT.md`, `PLAN.md`, `STRUCTURE.md`, `RULES.md` describe the new product
- [x] Migration: profile fields (name, ZIP, household size, onboarded at), insurance profile fields, `care_cases`, `case_providers`
- [x] Onboarding: about you → your insurance (every field skippable) → summary; new users land here
- [x] `/profile`: edit the same details later

**Done when:** a new user on production completes onboarding and the profile is saved and editable.

## Stage 6 — Cost engine (~1.5 h)

- [x] `care/safety.ts`: fixed warning signs and deterministic urgency, with tests
- [x] `care/routes.ts`: primary care, sports medicine, urgent care, ER with CPT codes
- [x] `costs/benchmarks.ts`: real CMS fee schedule amounts with source and year
- [x] `costs/patientShare.ts` and `costs/scenarios.ts` with tests (Michael's plan and an empty plan)

**Done when:** tests are green and Michael's three scenarios are checked by hand.

Verified 2026-11-15: Michael's specialist visit is $50; with a knee X-ray $100.06–$125.93; with a knee MRI $291.20–$415.89. All fit within his $1,200 remaining deductible. Cost modules are on production in commit `257cc4b`.

## Stage 7 — Care case (~2 h)

- [x] LLM intake: free text → summary, body area, suggested routes, mentioned warning signs
- [x] Case screen: safety questions → "Get care now" or care options with cost ranges
- [x] Cost forecast screen with assumptions and sources

**Done when:** on production, "knee hurts after tennis" leads to care options with costs, and "I can't put weight on it" leads to "Get care now".

Verified 2026-11-15 on production (`5d8d6c6`): real signup and Michael's full onboarding; successful LLM intake; all-no safety answers show the three care options and expected cost ranges; inability to bear weight shows "Get care now" without prices, even if a client submits `urgency=routine`. Editing safety answers hides previous forecasts. Other body areas show the scope limit, and signed-out case requests redirect to login. Local browser verification also confirmed the immediate warning before saving. Typecheck, lint, production build and all 178 tests passed. Intake has a 20-second timeout and can be skipped; model failure still opens safety questions.

## Stage 8 — Providers (~1.5 h)

- [x] Google Places search with NPI Registry fallback; source shown on every result
- [x] Provider cards: distance, rating, phone, website, directions, "Insurance: not verified"
- [x] Choose a provider → checklist of questions; case saved with estimated savings

**Done when:** on production, real providers near 78701 appear for each route and choosing one saves the case.

Verified 2026-11-15 on production (`8992fee`): new account with Michael's profile entered through onboarding (9 of 9 details); knee case with all-no safety answers; primary care, sports medicine and urgent care each returned 10 real Austin providers with "Insurance: not verified", phone, directions and "Source: CMS NPI Registry". Choosing a primary care provider saved the provider, the estimate snapshot with CMS PFS 2026 and KFF sources, the estimated difference vs. urgent care ($50.00) and the call checklist; the saved choice survives a reload. Production served NPI results, not Google Places, so distance and rating showed "not available": `GOOGLE_PLACES_API_KEY` is probably not set on Railway (not checked). Typecheck, lint and 210 tests passed locally.

## Stage 9 — Home, plan and landing (~2 h)

- [x] Home: describe-a-problem box, insurance overview with deductible progress, savings (estimated vs on bills), recent cases and visits
- [x] Navigation: Home · Get care · Bills · Plan
- [x] Landing: "Stop overpaying for healthcare", CTA "Find my savings"
- [x] Recheck Plus at $9.99; first case free; safety never paywalled
- [ ] Optional: insurance card photo fills the insurance profile

**Done when:** a new user can go landing → onboarding → case → provider → paywall → pay → second case, and add a bill after the visit.

Checked 2026-11-15 on production (`6060647`): the signed-out landing shows the new copy and CTA, and `/home` redirects to login; signed in, `/home` shows the case box, Michael's plan with deductible and out-of-pocket progress, $50.00 estimated from care choices and $96.00 worth asking about on bills, the chosen provider on the recent case and the latest bills. Navigation reads Home · Get care · Bills · Plan · Profile; Bills and "Your year" still load. A second case on a Recheck Plus account shows options and costs. A new free account that skipped the insurance step got its first case in full (wide ranges such as $0.00–$210.15 for a visit); its second case showed the safety questions for free and then the Recheck Plus paywall instead of options. After a Stripe test-mode payment the plan page shows Recheck Plus and the same case shows options and a provider search with 10 results. Bills were already in Michael's account. The insurance card photo is not built (optional). Stripe Checkout still shows the merchant name "nFactorial sandbox" instead of Recheck.

## Stage 10 — Demo and submission (last ~2 h)

- [ ] Michael's demo account created through the real onboarding and flows
- [ ] LLM and provider API failures show a clear message; layout checked on a phone
- [x] `README.md`: what it is, live link, test account, how to run, architecture in five lines
- [x] Remove dead code, unused dependencies, stray console output
- [ ] All submission items prepared (list them here once confirmed): ______
- [ ] Demo rehearsed twice end-to-end on production
- [ ] Feature freeze 2 hours before the deadline: bug fixes only

**Done when:** everything is submitted and the production app has been clicked through after the last deploy.
