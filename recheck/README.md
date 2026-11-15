# Recheck

**Stop overpaying for healthcare.** Recheck is a web app for insured American families. Before a visit, it tells you where to go for care, who is nearby and what you are likely to pay under your own insurance. After the visit, it checks the bill for errors and drafts the letter to dispute them.

- **Live app:** https://business-cup-production.up.railway.app
- **Test account:** given in the submission form. Or create your own: sign-up logs you in at once. Stripe runs in test mode, so you can pay with card `4242 4242 4242 4242`, any future date and any CVC.

## What it does

1. **Onboarding.** You enter your name, ZIP code and insurance: deductible and how much of it is met, out-of-pocket maximum, coinsurance and copays. Every field can be skipped.
2. **Free preventive care.** With your birth year and sex (optional), Recheck lists the USPSTF screenings and CDC vaccines your plan generally covers at $0 in-network, each with its official source. You record when you last had each one, and code shows what is due next. A colonoscopy counts for 10 years, a stool test for one.
3. **Describe the problem**, for example "my knee has hurt for a week after tennis". The AI summarizes what you wrote. Then fixed safety questions check for warning signs. Any warning sign shows **Get care now** and nothing else.
4. **Care options.** Primary care, sports medicine or urgent care. For each one you see what it's for and three cost scenarios: visit only, visit + X-ray and visit + MRI.
5. **Providers nearby** from Google Places or the CMS NPI Registry. Every result shows its source and the badge "Insurance: not verified".
6. **Choose and book.** The case is saved with its cost estimate and a checklist of questions for the call, starting with "Are you in-network for my exact plan?". You get the clinic's phone and a ready email. Recheck never books for you: you book with the clinic and save the date. The home page then shows the visit, and a calendar file is one click away.
7. **After the visit**, Recheck asks for the bill. Upload the bill and the EOB. Five code checks flag possible errors: duplicates, mismatches between the bill and the EOB, being billed before insurance paid, unclear lines and totals that don't add up. Recheck then drafts a dispute letter and a phone script.
8. **Ask Recheck.** Ask about insurance, bills or preventive care. Answers come only from 30 official documents (HealthCare.gov, the CMS No Surprises Act pages, the U.S. Department of Labor, California's DMHC), with links. Federal rules are labeled as applying in every state. California rules are labeled as applying only to state-regulated plans. If the documents don't answer the question, it says "I don't know".

**Recheck Plus, $9.99 a month.** Free: onboarding, preventive care, booking, the first care question in full, the first bill check and the first Ask question. Paid: every later care question, every bill check, letters, the yearly picture and unlimited Ask. Safety guidance is never behind the paywall.

## Why the numbers are real

- **Prices** come from the public CMS Medicare Physician Fee Schedule (2026), looked up by CPT code. Each price shows its source link. The markup that commercial insurers pay over Medicare comes from KFF and is shown as a labeled assumption.
- **Your share** is calculated in code from your own plan: copay, remaining deductible, coinsurance, capped at the out-of-pocket maximum. All money is integer cents. The result is a range, and it narrows the more of your plan you fill in.
- **Urgency** comes from a fixed rule set in `src/lib/care/safety.ts`, never from the LLM.
- **Providers** are real directory records. No demo data is substituted when a search fails.
- **Bill flags** come from pure functions in `src/lib/checks/`. The LLM only reads documents and writes explanations.
- **Preventive care** comes from USPSTF grade A/B and the CDC adult schedule (`src/lib/preventive/`), each with its source and the date it was checked. Who it applies to and when it is due is decided in code.
- **Ask Recheck** is retrieval over official documents in pgvector. Code keeps only the excerpts the answer cites, and the links come from the database, not from the model. Symptom questions go to the safety check.

## Architecture

1. **Next.js 16 + TypeScript** (strict). Server components and server actions, deployed on Railway.
2. **Supabase** handles Postgres with row-level security on every table, email auth and private file storage.
3. **The LLM** is called only through `src/lib/llm/client.ts`. It is used for document extraction, intake summaries, writing, and answering from retrieved official excerpts (embeddings: `text-embedding-3-small`, stored with pgvector). Every output is validated with Zod.
4. **Pure logic** lives in `src/lib/` and has unit tests: `care/` for safety and routes, `costs/` for benchmarks, your share and scenarios, `checks/` for bill checks, `providers/` for Places and NPI, `preventive/` for preventive care, and `knowledge/` for document chunking and answer checks.
5. **Stripe** Checkout and a signed webhook set the plan, and `src/lib/billing/plan.ts` decides what each plan can see.

More detail: [`docs/PROJECT.md`](docs/PROJECT.md) (product), [`docs/STRUCTURE.md`](docs/STRUCTURE.md) (code and data model) and [`docs/RULES.md`](docs/RULES.md) (rules for contributors and agents).

## Run it locally

```bash
npm ci
cp .env.example .env.local   # fill in Supabase, LLM and Stripe test keys
npm run dev
```

Apply the SQL files in `supabase/migrations/` to your Supabase project in order, then load the Ask knowledge base with `npm run build:knowledge`. `GOOGLE_PLACES_API_KEY` is optional: without it, provider search uses the NPI Registry, which needs no key.

Checks run before every commit:

```bash
npm run typecheck && npm run lint && npm test
```

Recheck explains costs and bills. It does not give legal or medical advice.
