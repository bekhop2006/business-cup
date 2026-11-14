# AGENTS.md

Entry point for any coding agent working in this repository (Claude Code, Cursor, Codex and others).

## Read first

Before writing any code, read these files in order:

1. `docs/PROJECT.md` — what we are building, for whom, and why.
2. `docs/STRUCTURE.md` — stack, folder layout, data model, document pipeline.
3. `docs/PLAN.md` — the 24-hour plan. Find the current stage and work only on it.
4. `docs/RULES.md` — the full rules. The short version is below.

## The ten rules that matter most

1. **Work on the current stage in `docs/PLAN.md`.** Tick a checkbox when its task is done and verified. Do not start a later stage early.
2. **The core value must be real.** No hardcoded results, no mock data in production code paths. Sample documents live only in `fixtures/` and are used only by tests and the seed script.
3. **Checks are code, not LLM.** Every flag on a bill is produced by a pure function in `src/lib/checks/`. The LLM reads documents and writes text. It never decides what is an error.
4. **Every flag points to a line item.** A flag without a `lineItemId` or `documentId` reference must not exist.
5. **The LLM never does arithmetic.** It returns numbers; code adds, compares and totals them.
6. **All LLM output is validated.** Structured output goes through a Zod schema in `src/lib/schemas/`. Invalid output marks the document `needs_review`, never crashes the request.
7. **Money is integer cents.** Never floats. Format only at the UI edge with `src/lib/money.ts`.
8. **No secrets and no document contents in git or logs.** Keys come from environment variables. Never log extracted medical or billing data.
9. **Stay in scope.** B2C, web only. No lab results, appointments, prescriptions, hospital or insurer integrations, native mobile apps.
10. **Keep `main` deployable.** Run `npm run typecheck && npm run lint && npm test` before every commit. Small commits with clear messages.

## When unsure

Ask the human instead of inventing. This applies especially to medical billing codes, prices, legal wording and anything that changes the data model.
