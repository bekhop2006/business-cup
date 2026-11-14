#!/usr/bin/env python3
"""Generates the synthetic bills and EOBs in fixtures/.

Every person, provider, insurer, address, account and claim number below is
made up. The planted errors are described in fixtures/README.md.

Requires Google Chrome (headless rendering) and Pillow (photo effects).
Run from the repository root of the app:  python3 scripts/fixtures/make_fixtures.py
"""

import html
import pathlib
import subprocess
import tempfile

from PIL import Image, ImageEnhance, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "fixtures"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
* { box-sizing: border-box; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12.5px; }
.page { width: 8.5in; min-height: 11in; padding: 0.55in 0.6in; background: #fff; }
header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #1d3557; padding-bottom: 14px; }
.logo { font-size: 21px; font-weight: 700; color: #1d3557; }
.addr { margin-top: 6px; line-height: 1.45; color: #444; }
h1 { margin: 0 0 8px; font-size: 17px; letter-spacing: 0.04em; text-align: right; color: #1d3557; }
h2 { font-size: 13px; margin: 22px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; color: #1d3557; }
table { border-collapse: collapse; width: 100%; }
.meta th { text-align: left; font-weight: 400; color: #555; padding: 2px 10px 2px 0; white-space: nowrap; }
.meta td { text-align: right; font-weight: 600; padding: 2px 0; white-space: nowrap; }
.callout { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; background: #f1f4f9; border: 1px solid #c9d3e3; padding: 12px 16px; }
.callout strong { font-size: 22px; }
.lines th { background: #1d3557; color: #fff; font-weight: 600; text-align: left; padding: 6px 7px; font-size: 11.5px; }
.lines td { padding: 6px 7px; border-bottom: 1px solid #dde3ec; vertical-align: top; }
.lines tr:nth-child(even) td { background: #f8f9fb; }
.num { text-align: right; white-space: nowrap; }
.lines tfoot td { font-weight: 700; border-top: 2px solid #1d3557; background: #fff; }
.summary { width: 52%; margin: 16px 0 0 auto; }
.summary td { padding: 4px 0; }
.summary tr.total td { border-top: 2px solid #1d3557; font-weight: 700; font-size: 14px; padding-top: 7px; }
.note { margin-top: 22px; line-height: 1.5; color: #333; }
footer { margin-top: 34px; padding-top: 10px; border-top: 1px dashed #999; color: #666; font-size: 10.5px; line-height: 1.5; }
"""


def esc(text: str) -> str:
    return html.escape(text)


def meta_table(rows: list[tuple[str, str]]) -> str:
    cells = "".join(f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>" for k, v in rows)
    return f'<table class="meta">{cells}</table>'


def page(body: str) -> str:
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="page">{body}</div></body></html>'


def bill_html(doc: dict) -> str:
    rows = "".join(
        "<tr>"
        f"<td>{esc(line['date'])}</td><td>{esc(line['code'])}</td><td>{esc(line['description'])}</td>"
        f"<td class=\"num\">{esc(line['qty'])}</td><td class=\"num\">{esc(line['charge'])}</td>"
        "</tr>"
        for line in doc["lines"]
    )
    summary = "".join(
        f'<tr class="{"total" if i == len(doc["summary"]) - 1 else ""}"><td>{esc(k)}</td><td class="num">{esc(v)}</td></tr>'
        for i, (k, v) in enumerate(doc["summary"])
    )
    return page(
        f"""
<header>
  <div><div class="logo">{esc(doc['provider'])}</div><div class="addr">{doc['address']}</div></div>
  <div><h1>PATIENT STATEMENT</h1>{meta_table(doc['meta'])}</div>
</header>
<div class="callout"><span>Amount due</span><strong>{esc(doc['amount_due'])}</strong><span>{esc(doc['due_note'])}</span></div>
<h2>Services</h2>
<table class="lines">
  <thead><tr><th>Date of service</th><th>Code</th><th>Description</th><th class="num">Qty</th><th class="num">Charges</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
<table class="summary">{summary}</table>
<p class="note">{doc['note']}</p>
<footer>Please detach and return the bottom portion with your payment. Make checks payable to {esc(doc['provider'])}.
Account {esc(doc['account'])}. Synthetic test document: all names and numbers are fictional.</footer>
"""
    )


def eob_html(doc: dict) -> str:
    rows = "".join(
        "<tr>"
        f"<td>{esc(line['date'])}</td><td>{esc(line['code'])}</td><td>{esc(line['description'])}</td>"
        f"<td class=\"num\">{esc(line['billed'])}</td><td class=\"num\">{esc(line['allowed'])}</td>"
        f"<td class=\"num\">{esc(line['paid'])}</td><td class=\"num\">{esc(line['patient'])}</td>"
        "</tr>"
        for line in doc["lines"]
    )
    t = doc["totals"]
    return page(
        f"""
<header>
  <div><div class="logo">{esc(doc['insurer'])}</div><div class="addr">{doc['address']}</div></div>
  <div><h1>EXPLANATION OF BENEFITS</h1>{meta_table(doc['meta'])}</div>
</header>
<div class="callout"><span>THIS IS NOT A BILL</span><span>What you may owe the provider</span><strong>{esc(t['patient'])}</strong></div>
<h2>Claim details</h2>
<table class="lines">
  <thead><tr><th>Service date</th><th>Code</th><th>Service</th><th class="num">Amount billed</th><th class="num">Allowed amount</th><th class="num">Plan paid</th><th class="num">Your responsibility</th></tr></thead>
  <tbody>{rows}</tbody>
  <tfoot><tr><td colspan="3">Claim totals</td><td class="num">{esc(t['billed'])}</td><td class="num">{esc(t['allowed'])}</td><td class="num">{esc(t['paid'])}</td><td class="num">{esc(t['patient'])}</td></tr></tfoot>
</table>
<p class="note">{doc['note']}</p>
<footer>Questions about this claim? Call Member Services at the number on your ID card.
Synthetic test document: all names and numbers are fictional.</footer>
"""
    )


ADDRESS_MAPLE = "410 Orchard Lane, Suite 200<br>Springfield, IL 62704<br>Billing questions: (217) 555-0142"
ADDRESS_LAKEVIEW = "2500 Lakeshore Drive<br>Springfield, IL 62702<br>Patient Financial Services: (217) 555-0190"
ADDRESS_QUICKCARE = "88 Market Street<br>Springfield, IL 62701<br>Billing: (217) 555-0177"
ADDRESS_BLUEPOINT = "PO Box 4410<br>Chicago, IL 60680<br>Member Services: (800) 555-0110"

MAPLE_BILL = {
    "provider": "Maple Grove Pediatrics",
    "address": ADDRESS_MAPLE,
    "account": "MGP-118204",
    "meta": [("Statement date", "04/20/2026"), ("Account number", "MGP-118204"), ("Guarantor", "Jordan Ellis"), ("Patient", "Mia Ellis")],
    "amount_due": "$40.00",
    "due_note": "Due by 05/15/2026",
    "lines": [
        {"date": "03/12/2026", "code": "99213", "description": "Office visit, established patient, low complexity", "qty": "1", "charge": "$185.00"},
        {"date": "03/12/2026", "code": "87880", "description": "Rapid strep test (Group A)", "qty": "1", "charge": "$45.00"},
    ],
    "summary": [
        ("Total charges", "$230.00"),
        ("Insurance payments (Bluepoint Health Plan)", "-$148.40"),
        ("Insurance adjustments", "-$41.60"),
        ("Patient responsibility", "$40.00"),
    ],
    "note": "Your insurance has processed this claim. The balance shown is your copay and coinsurance.",
}

LAKEVIEW_BILL = {
    "provider": "Lakeview General Hospital",
    "address": ADDRESS_LAKEVIEW,
    "account": "LGH-55091873",
    "meta": [("Statement date", "06/10/2026"), ("Account number", "LGH-55091873"), ("Guarantor", "Jordan Ellis"), ("Patient", "Sam Ellis")],
    "amount_due": "$393.40",
    "due_note": "Due by 07/05/2026",
    "lines": [
        {"date": "05/03/2026", "code": "99284", "description": "Emergency department visit, moderate severity", "qty": "1", "charge": "$1,450.00"},
        {"date": "05/03/2026", "code": "71046", "description": "X-ray chest, 2 views", "qty": "1", "charge": "$380.00"},
        {"date": "05/03/2026", "code": "85025", "description": "Complete blood count (CBC) with differential", "qty": "1", "charge": "$96.00"},
        {"date": "05/03/2026", "code": "85025", "description": "Complete blood count (CBC) with differential", "qty": "1", "charge": "$96.00"},
        {"date": "05/03/2026", "code": "80053", "description": "Comprehensive metabolic panel", "qty": "1", "charge": "$142.00"},
        {"date": "05/03/2026", "code": "96374", "description": "IV push, single or initial drug", "qty": "1", "charge": "$310.00"},
        {"date": "05/03/2026", "code": "J2405", "description": "Ondansetron injection, per 1 mg", "qty": "4", "charge": "$48.00"},
    ],
    "summary": [
        ("Total charges", "$2,522.00"),
        ("Insurance payments (Bluepoint Health Plan)", "-$1,189.60"),
        ("Contractual adjustments", "-$939.00"),
        ("Amount due from patient", "$393.40"),
    ],
    "note": "If you have questions about your bill, call Patient Financial Services. Financial assistance may be available.",
}

LAKEVIEW_EOB = {
    "insurer": "Bluepoint Health Plan",
    "address": ADDRESS_BLUEPOINT,
    "meta": [("Date processed", "05/24/2026"), ("Member", "Jordan Ellis"), ("Patient", "Sam Ellis"), ("Claim number", "BP-2026-0518-3304"), ("Provider", "Lakeview General Hospital")],
    "lines": [
        {"date": "05/03/2026", "code": "99284", "description": "Emergency dept visit", "billed": "$1,450.00", "allowed": "$980.00", "paid": "$784.00", "patient": "$196.00"},
        {"date": "05/03/2026", "code": "71046", "description": "Chest x-ray, 2 views", "billed": "$380.00", "allowed": "$210.00", "paid": "$168.00", "patient": "$42.00"},
        {"date": "05/03/2026", "code": "85025", "description": "Blood count (CBC)", "billed": "$96.00", "allowed": "$40.00", "paid": "$32.00", "patient": "$8.00"},
        {"date": "05/03/2026", "code": "80053", "description": "Metabolic panel", "billed": "$142.00", "allowed": "$62.00", "paid": "$49.60", "patient": "$12.40"},
        {"date": "05/03/2026", "code": "96374", "description": "IV push", "billed": "$310.00", "allowed": "$175.00", "paid": "$140.00", "patient": "$35.00"},
        {"date": "05/03/2026", "code": "J2405", "description": "Ondansetron injection", "billed": "$48.00", "allowed": "$20.00", "paid": "$16.00", "patient": "$4.00"},
    ],
    "totals": {"billed": "$2,426.00", "allowed": "$1,487.00", "paid": "$1,189.60", "patient": "$297.40"},
    "note": "Your responsibility includes your deductible, copay and coinsurance. You should not be billed more than this amount for in-network services.",
}

MAPLE_EOB = {
    "insurer": "Bluepoint Health Plan",
    "address": ADDRESS_BLUEPOINT,
    "meta": [("Date processed", "04/02/2026"), ("Member", "Jordan Ellis"), ("Patient", "Mia Ellis"), ("Claim number", "BP-2026-0312-7781"), ("Provider", "Maple Grove Pediatrics")],
    "lines": [
        {"date": "03/12/2026", "code": "99213", "description": "Office visit", "billed": "$185.00", "allowed": "$150.00", "paid": "$125.00", "patient": "$25.00"},
        {"date": "03/12/2026", "code": "87880", "description": "Strep test", "billed": "$45.00", "allowed": "$38.40", "paid": "$23.40", "patient": "$15.00"},
    ],
    "totals": {"billed": "$230.00", "allowed": "$188.40", "paid": "$148.40", "patient": "$40.00"},
    "note": "Your responsibility for this claim is your $25.00 copay and $15.00 coinsurance.",
}

QUICKCARE_BILL = {
    "provider": "QuickCare Urgent Care",
    "address": ADDRESS_QUICKCARE,
    "account": "QC-2207719",
    "meta": [("Statement date", "07/30/2026"), ("Account number", "QC-2207719"), ("Guarantor", "Jordan Ellis"), ("Patient", "Jordan Ellis")],
    "amount_due": "$825.00",
    "due_note": "Due upon receipt",
    "lines": [
        {"date": "07/18/2026", "code": "99214", "description": "Office visit, established patient, moderate complexity", "qty": "1", "charge": "$245.00"},
        {"date": "07/18/2026", "code": "73610", "description": "X-ray ankle, 3 or more views", "qty": "1", "charge": "$165.00"},
        {"date": "07/18/2026", "code": "29540", "description": "Strapping, ankle and/or foot", "qty": "1", "charge": "$85.00"},
        {"date": "07/18/2026", "code": "L4361", "description": "Walking boot, pneumatic, prefabricated", "qty": "1", "charge": "$210.00"},
        {"date": "07/18/2026", "code": "", "description": "MISC SVC 0099", "qty": "1", "charge": "$60.00"},
    ],
    "summary": [
        ("Total charges", "$825.00"),
        ("Insurance payments", "$0.00"),
        ("Balance due", "$825.00"),
    ],
    "note": "Insurance claim pending. Payment is due upon receipt of this statement.",
}


def render(html_text: str, out: pathlib.Path, kind: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as handle:
        handle.write(html_text)
        src = handle.name
    common = [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-pdf-header-footer"]
    if kind == "pdf":
        subprocess.run(common + [f"--print-to-pdf={out}", f"file://{src}"], check=True, capture_output=True)
    else:
        subprocess.run(
            common + ["--force-device-scale-factor=2", "--window-size=816,1056", f"--screenshot={out}", f"file://{src}"],
            check=True,
            capture_output=True,
        )


def phone_photo(png: pathlib.Path, out: pathlib.Path, blur: float, angle: float) -> None:
    """Turns a clean render into something that looks like a phone photo of paper."""
    paper = Image.open(png).convert("RGB")
    background = Image.new("RGB", (int(paper.width * 1.12), int(paper.height * 1.08)), (92, 86, 78))
    background.paste(paper, ((background.width - paper.width) // 2, (background.height - paper.height) // 2))
    photo = background.rotate(angle, resample=Image.Resampling.BICUBIC, fillcolor=(92, 86, 78))
    photo = ImageEnhance.Brightness(photo).enhance(0.93)
    photo = ImageEnhance.Contrast(photo).enhance(0.9)
    photo = photo.filter(ImageFilter.GaussianBlur(blur))
    photo = photo.resize((photo.width * 3 // 4, photo.height * 3 // 4))
    photo.save(out, "JPEG", quality=80)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    render(bill_html(LAKEVIEW_BILL), OUT / "lakeview-bill-duplicate-line.pdf", "pdf")
    render(eob_html(LAKEVIEW_EOB), OUT / "lakeview-eob.pdf", "pdf")
    render(eob_html(MAPLE_EOB), OUT / "maple-grove-eob.pdf", "pdf")
    render(bill_html(QUICKCARE_BILL), OUT / "quickcare-bill-total-mismatch.pdf", "pdf")

    with tempfile.TemporaryDirectory() as tmp:
        maple_png = pathlib.Path(tmp) / "maple.png"
        render(bill_html(MAPLE_BILL), maple_png, "png")
        phone_photo(maple_png, OUT / "maple-grove-bill-photo.jpg", blur=0.6, angle=-2.2)

        lakeview_png = pathlib.Path(tmp) / "lakeview.png"
        render(bill_html(LAKEVIEW_BILL), lakeview_png, "png")
        phone_photo(lakeview_png, OUT / "blurry-bill-photo.jpg", blur=9, angle=3.5)

    for path in sorted(OUT.iterdir()):
        if path.suffix in {".pdf", ".jpg"}:
            print(f"{path.name}: {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
