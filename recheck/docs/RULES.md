# Rules for agents

These rules apply to every coding agent and every human contributor. If a request conflicts with a rule, stop and ask.

## 1. How to work

- Read `PROJECT.md`, `STRUCTURE.md` and `PLAN.md` before the first change in a session.
- Work only on the current stage in `PLAN.md`. Tick a checkbox only after verifying the task works.
- Before a large change, state the plan in a few lines and wait for approval. Small fixes need no approval.
- Change only what the task requires. Do not refactor, rename or reformat unrelated code.
- When a task is done, report in three lines: what changed, how it was verified, what is left.
- If something in these docs turns out to be wrong, update the doc in the same commit as the code.

## 2. Scope

- B2C, web only. The app must work in a desktop and a phone browser.
- Do not build: diagnoses, lab results, appointment booking, prescriptions, hospital or insurer integrations, real-time insurance verification, native apps, sending letters or calling on the user's behalf.
- Do not add features that are not in `PLAN.md` without asking.

## 3. The core value must be real

Judges read the repository and check that nothing is faked.

- No hardcoded analysis results, sample responses or placeholder data in `src/`.
- Sample documents live in `fixtures/`. They are used by tests and by `scripts/seed.ts`, which runs them through the real pipeline.
- No feature flags or branches that return canned data for a demo account.
- If a feature is not finished, hide it from the UI instead of faking it.
- **Prices:** only real public benchmarks (CMS fee schedules) stored with their source URL and year, or numbers the user entered. The patient's share is computed in `src/lib/costs/` from the user's own insurance profile. Every assumption (for example a commercial-vs-Medicare multiplier) is labeled as an assumption in the UI. Never show a made-up price for a real clinic.
- **Providers:** only real records from Google Places or the CMS NPI Registry, each carrying its source. Insurance network status is always "not verified". If both sources fail, say so; never substitute demo providers.
- **Savings** from choosing a provider are labeled as estimates. Never call them realised savings.

## 4. LLM usage

- Only `src/lib/llm/client.ts` talks to the LLM provider. Everything else calls functions in `src/lib/llm/`.
- Prompts live in `src/lib/llm/prompts/`, one file per task. No prompt text inline in routes or components.
- Every structured response is parsed with a Zod schema. On failure: retry once, then mark the document `needs_review`.
- **The LLM does not decide what is an error.** Flags come only from `src/lib/checks/`. The LLM receives existing flags and explains them.
- **The LLM does not do arithmetic.** Sums, differences and totals are computed in code.
- **The LLM does not decide urgency.** Warning signs and urgency come only from `src/lib/care/safety.ts`. The LLM may only pre-fill the safety questions from what the person wrote.
- The LLM never diagnoses and never suggests skipping or delaying care to save money.
- The LLM must not invent billing codes, prices or legal claims. Prompts tell it to say "not stated in the document" when information is missing.
- Extraction and text generation are separate calls.
- Set a timeout on every LLM call and handle failure with a clear message to the user.

## 5. Data and money

- Money is stored and computed as integer cents. Use `src/lib/money.ts` to parse and format.
- Dates are ISO `YYYY-MM-DD` for service dates, UTC timestamps for events.
- Every flag references a `line_item_id` or a `document_id`. The UI always shows which line a flag is about.
- Database changes go through a new migration file. Never edit a migration that has been applied.
- Every table has row-level security. Every query is scoped to the current user.

## 6. Privacy and security

Users upload medical and financial documents.

- Never commit secrets. All keys come from environment variables listed in `.env.example`.
- Never log document contents, extracted data, names or amounts. Log ids and statuses only.
- Files are stored privately and served through short-lived signed URLs.
- Webhooks (Stripe, inbound email, cron) verify a signature or secret before doing anything.
- Validate every API input with Zod. Check file type and size on upload.
- "Delete all my data" removes database rows and stored files.
- The UI states that Recheck does not give legal or medical advice.
- A warning sign always shows "Get care now" first. Safety guidance is never behind the paywall.
- Collect only the health details needed for the case; insurance member IDs are never stored.
- Do not put real personal documents in `fixtures/`. Use synthetic or fully anonymized samples.

## 7. Code quality

- TypeScript strict mode. No `any`, no `@ts-ignore` without a comment explaining why.
- Business logic lives in `src/lib/`. Components render and call; routes validate, call `lib`, and respond.
- Checks are pure functions with unit tests. A new check is not done without tests for a positive and a negative case.
- Functions are small and named for what they return. No clever abstractions; this is a 24-hour codebase that judges will read.
- Handle the three UI states everywhere: loading, empty, error.
- Add a dependency only when it saves real time, and say why in the commit message.
- No commented-out code, no stray `console.log`.

## 8. UI and copy

- All user-facing text is in English, in plain language, at the reading level of a busy parent.
- Say what the user should do next on every screen.
- Dollar amounts are always formatted the same way (`$1,234.56`).
- Never present a flag as a certainty. Use "this looks like" and "worth asking about".
- The tagline is "Stop overpaying for healthcare." The bill-review part may still say "Don't pay it. Recheck it."

## 9. Git

- `main` is always deployable; Railway deploys from it.
- Before every commit: `npm run typecheck && npm run lint && npm test`.
- Small commits. Message format: `area: what changed`, for example `checks: add duplicate line detection`.
- Do not force-push, rewrite history or change deployment settings without asking.
- Do not commit files from `fixtures/` that contain real personal data, `.env` files, or build output.

## 10. Definition of done

A task is done when all of these are true:

- It works on the deployed app, not only locally.
- Types, lint and tests pass.
- Errors are handled and shown to the user in plain words.
- No rule above is broken.
- The checkbox in `PLAN.md` is ticked.
