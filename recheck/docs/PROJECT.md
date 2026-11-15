# Recheck — project brief

**Tagline:** Stop overpaying for healthcare.

**One sentence:** Recheck helps insured American families know where to go for care, what they might pay under their own insurance, and — after the visit — whether the bill is right.

## Context

- Hackathon: Business Cup 2.0, "From zero to product". 24 hours. The product must sell: judges score a business, not a demo.
- Track: **Money**.
- Hard requirements (pass/fail): **B2C only**, **web only** (no mobile apps), all submission items delivered.
- Judging: 40% does it work end-to-end in production with a real core value and good code; 20% what we sell and why users return; 15% problem and user; 15% business potential; 10% originality.
- Pivot (hour 12): the first version only reviewed bills after a visit. It now covers the whole visit: before (navigation and cost), and after (bill review, already built).

## User

**Michael**, 46, software engineer in San Francisco (ZIP 94110). Married, three children, employer-sponsored PPO. He handles the household money, doesn't fully understand his coverage, and doesn't want to spend hours calling clinics and his insurer.

His goal: "I want to get the medical care I need without paying more than necessary."

## Pain

- **Before a visit:** people don't know which kind of provider to see, whether a clinic takes their plan, or what they will personally pay after deductible, copay and coinsurance. Prices for the same service vary widely.
- **After a visit:** bills are confusing and often wrong — duplicate lines, amounts the insurer already covered, charges that don't match the EOB. People pay them as they are.

## What the product does

1. **Onboarding:** name, ZIP, household size, optional birth year, sex and TB-risk answer, an insurance profile (insurer, plan type, deductible and how much is met, out-of-pocket max, coinsurance, copays). Every field can be skipped. Saved once, reused everywhere. A third step lists **free preventive care** (USPSTF screenings, CDC vaccines) that applies to the person, generally $0 in-network; they record when they last had each one and Recheck shows when the next is due.
2. **Describe the problem:** "My knee has hurt for a week after tennis. I don't want to overpay." The AI summarises it; a fixed set of safety questions checks for warning signs. Any warning sign → "Get care now", with no selling and no paywall.
3. **Care options:** primary care, sports medicine, urgent care — what each is for and roughly what it costs.
4. **Real providers nearby** (Google Places, CMS NPI Registry as fallback): address, distance, rating, phone, website. Insurance network status is always shown as **not verified**.
5. **Cost forecast:** visit only / + X-ray / + MRI. Prices are real public benchmarks (CMS Medicare Physician Fee Schedule), the person's share is computed by code from their own plan, and every assumption is shown. "This does not mean you need an X-ray or MRI."
6. **Choose and book:** a checklist of questions to ask ("Are you in-network for my exact plan?"), the clinic's phone and a ready email. The person books it themselves and saves the date; Recheck shows it on the home page, offers a calendar file, and after the visit asks for the bill. The case and its estimated savings are saved.
7. **After the visit:** upload the bill and EOB → Recheck explains each line, flags possible errors and writes a dispute letter (built in stages 1–3).
8. **Home dashboard:** insurance overview with deductible progress, estimated savings from choices, money worth asking about on bills, recent cases and visits.

## What counts as suspicious on a bill

- The same service billed twice.
- The bill asks for more than the EOB says the patient owes.
- A bill with no insurance payment and no EOB yet.
- A line with no code and no understandable description.
- Line items do not add up to the stated total.

## Business model

Subscription. **Recheck Plus — $9.99 a month.** Free: onboarding, the first care case in full, the first bill check. Paid: unlimited care cases with cost forecasts, every bill check, dispute letters and scripts, the yearly picture. Safety warnings are never behind the paywall.

Why people return: every new health need is a new case, every visit brings a bill and an EOB, the deductible progresses through the year, and a dispute lasts weeks.

## Out of scope

- Diagnoses or telling anyone to skip care to save money.
- Real-time insurance eligibility or network verification, insurer or hospital integrations.
- Booking appointments, sending letters or calling on the user's behalf (the person books and tells us the date).
- Family profiles (only a household size field), a second paid tier.
- Native mobile apps.

## Open items

- [ ] Exact list and format of the submission items.
- [ ] Market size figures with sources for the pitch.
