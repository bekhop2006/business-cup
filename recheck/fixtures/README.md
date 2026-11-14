# Fixtures

Synthetic medical bills and Explanations of Benefits (EOBs) for tests and the demo seed.
Every person, provider, insurer, address, account and claim number is fictional.
Regenerate them with `python3 scripts/fixtures/make_fixtures.py` (needs Google Chrome and Pillow).

The family: Jordan Ellis (account holder), Sam Ellis, Mia Ellis. Insurer: Bluepoint Health Plan.

| File | Document | Planted problem | Expected result |
| --- | --- | --- | --- |
| `maple-grove-bill-photo.jpg` | Phone photo of a pediatric bill for Mia, 2026-03-12 | None | `parsed`, 2 lines, total $230.00, patient owes $40.00 |
| `maple-grove-eob.pdf` | EOB for the same visit | None, matches the bill | `parsed`, 2 lines, patient responsibility $40.00 |
| `lakeview-bill-duplicate-line.pdf` | Emergency room bill for Sam, 2026-05-03 | CBC (85025) billed twice | `parsed`, 7 lines, total $2,522.00, amount due $393.40 |
| `lakeview-eob.pdf` | EOB for the same visit | Insurer says the patient owes $297.40, the bill asks for $393.40 (the extra $96.00 is the duplicate CBC) | `parsed`, 6 lines, total $2,426.00 |
| `quickcare-bill-total-mismatch.pdf` | Urgent care bill for Jordan, 2026-07-18 | Lines add up to $765.00 but the total says $825.00; a line with no code ("MISC SVC 0099"); no EOB yet | `needs_review` until the user confirms the lines |
| `blurry-bill-photo.jpg` | Unreadable photo of the Lakeview bill | Too blurry to read | `needs_review` |

`expected.json` holds the exact values used by `scripts/check-extraction.ts`.
