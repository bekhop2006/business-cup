# Recheck — project brief

**Tagline:** Don't pay it. Recheck it.

**One sentence:** Recheck keeps all of a family's medical bills in one place, explains each one in plain language, finds overcharges and helps dispute them.

## Context

- Hackathon: Business Cup 2.0, "From zero to product". 24 hours.
- Track: **Money**.
- Hard requirements (pass/fail): **B2C only**, **web only** (no mobile apps), all submission items delivered.
- Judging: 40% does it work end-to-end in production with a real core value and good code; 20% what we sell and why users return; 15% problem and user; 15% business potential; 10% originality.

## User

A working adult aged 30–40 in the US with employer health insurance and a family. The family has several doctor visits a year. This person handles the household paperwork and money.

## Pain

Medical bills are confusing and often contain errors. People pay them as they are because they do not know how to dispute a bill and are afraid of collections.

- One visit produces several documents from different senders: a hospital bill, a separate physician bill, an Explanation of Benefits (EOB) from the insurer. They do not match.
- Bills use codes and abbreviations instead of plain names.
- Bills contain duplicate lines, services that did not happen, and amounts the insurer already covered.
- People do not know how much they have spent this year or how far they are from their deductible.

## What the product does

The main entity is a **visit**, not a document.

1. The user uploads a photo or PDF of a bill or EOB (or forwards it by email, if that stage is built).
2. Recheck detects the document type, extracts line items and amounts, and attaches the document to the right visit.
3. The visit card shows what was billed, what insurance paid, and what the user owes.
4. Each line is explained in plain language. Suspicious lines are flagged with a reason.
5. Recheck drafts a dispute letter and a phone script, then reminds the user about follow-ups.
6. A yearly dashboard shows total spent, deductible progress, amount owed now, and money saved.

## What counts as suspicious

- The same service billed twice.
- The bill amount does not match the EOB.
- The bill was issued before the insurer processed the claim.
- A line with no understandable description.
- Line items do not add up to the stated total.

## Business model

Subscription, $8–10 per month per family. The first bill check is free and shows the potential savings in dollars. Letters, scripts, reminders and the yearly dashboard are paid.

Users return because every new visit brings new documents, a dispute lasts for weeks, and the yearly picture is worth watching.

## Out of scope

- Lab results, diagnoses, appointments, prescriptions.
- Integrations with hospital portals or insurers.
- Sending letters or making calls on the user's behalf.
- Family roles and permissions. A "whose visit" label is enough.
- Native mobile apps.

## Open items

- [ ] Exact list and format of the submission items.
- [ ] Market size figures with sources for the pitch.
- [ ] Custom domain (needed for inbound email).
