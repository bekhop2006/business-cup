# Demo script (about 3 minutes)

The live demo runs on production with Michael's account, entered through the real onboarding. Nothing is pre-faked: every number, provider and answer on screen comes from the app.

## Michael

San Francisco, ZIP 94110. Born 1980, male. UnitedHealthcare PPO.

| Field | Value |
|---|---|
| Deductible | $1,500 ($300 met) |
| Out-of-pocket max | $6,000 |
| Coinsurance | 20% |
| Copays | $25 primary care, $50 specialist, $75 urgent care, $250 ER |
| Preventive care | flu shot October 2026; nothing else recorded |
| Plan | Recheck Plus (Stripe test card `4242 4242 4242 4242`) |

## Before the demo

- [ ] Log in as Michael on production in one tab, and keep a second tab on a care case that is already finished (choice saved, visit booked) as a fallback.
- [ ] Bills: one visit with a bill and an EOB already uploaded and flagged, so the "after the visit" part needs no live upload.
- [ ] Open the landing page, home, Ask and Bills once to warm them up.
- [ ] Phone ready if showing the mobile view. Notifications off.

## The run

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Landing | Scroll once. | US families overpay because they don't know where to go, what it costs on their plan, or that their bill is wrong. Recheck covers before, during and after the visit. |
| 0:20 | Profile | Show insurance and the **Free preventive care** card. | Michael's plan is saved once and reused everywhere. At 46, colorectal screening is free for him in-network (USPSTF, linked). His next flu shot is due October 2027. That is money he would otherwise not use. |
| 0:45 | Home | Type: *My knee has hurt for a week after tennis. I can walk, but stairs are uncomfortable.* | One sentence in plain words. |
| 1:00 | Safety | Answer all **No**, save. | Urgency is decided by fixed rules in code, never by the AI. Any warning sign shows "Get care now" and nothing else, even on the free plan. |
| 1:15 | Options | Point at sports medicine vs urgent care. | Prices are public CMS benchmarks. Michael's share is computed from his own deductible, coinsurance and copays. X-ray and MRI are shown as scenarios, not advice. |
| 1:35 | Providers | Search sports medicine near 94110, choose one. | Real clinics from the CMS NPI Registry, with the badge "Insurance: not verified". We never pretend to know the network. |
| 1:50 | Book | Show **Call**, **Copy email text**, then save a date next week. | Recheck doesn't book for you; it hands you the call script and keeps the date. The home page shows the visit, and afterwards it asks for the bill. |
| 2:10 | Ask | Ask: *I got a bill from an out-of-network anesthesiologist after surgery at an in-network hospital. What are my rights?* | It answers only from official documents: the federal No Surprises Act, plus California's AB 72 for Michael, and it says when state law doesn't apply to self-funded plans. Every claim links to its source. |
| 2:35 | Bills | Open the flagged visit and its letter. | After the visit, code checks the bill against the EOB and flags duplicates and mismatches. The letter and phone script are ready to send. |
| 2:50 | Plan | Show Recheck Plus. | $9.99 a month. The first care question, first bill check and first Ask are free; safety guidance is never paywalled. |

## If something fails

- **AI summary slow or down:** the case still opens with the safety questions ("What you told us"). Keep going.
- **Provider search unavailable:** say so; the page tells people to use their insurer's directory. Switch to the fallback tab with a finished case.
- **Ask down:** "We couldn't answer right now" appears. Use the fallback tab, or describe the answer from the sources.
- **Anything else:** switch to the fallback tab and continue from Book.
