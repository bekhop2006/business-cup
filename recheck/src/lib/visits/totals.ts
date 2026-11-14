import { sumCents } from "@/lib/money";
import type { DocumentType } from "@/lib/schemas/extracted";

// Visit totals are chosen from the visit's documents in code. Nothing here is
// estimated: every number is one the bill or the EOB printed.

export type VisitStatus = "waiting_for_insurance" | "to_pay" | "disputing" | "closed";

export type TotalsDocument = {
  type: DocumentType | null;
  created_at: string;
  stated_total_cents: number | null;
  line_amounts_cents: number[];
  insurance_paid_cents: number | null;
  patient_responsibility_cents: number | null;
};

export type VisitTotals = {
  billed_cents: number;
  insurance_paid_cents: number;
  patient_owes_cents: number;
  status: VisitStatus;
};

const newestFirst = (a: TotalsDocument, b: TotalsDocument) => b.created_at.localeCompare(a.created_at);

const billedOn = (document: TotalsDocument) =>
  document.stated_total_cents ?? sumCents(document.line_amounts_cents);

// billed: the newest bill's total charges (or the EOB's, if there is no bill).
// insurance paid: what the newest EOB says the plan paid, else the bill's
//   insurance payments line.
// patient owes: what the newest bill asks for, else the EOB's patient
//   responsibility. A difference between the two is a flag, not a total.
export function computeVisitTotals(
  documents: TotalsDocument[],
  currentStatus: VisitStatus,
): VisitTotals {
  const bill = documents.filter((d) => d.type === "bill").sort(newestFirst)[0];
  const eob = documents.filter((d) => d.type === "eob").sort(newestFirst)[0];

  const billed = bill ? billedOn(bill) : eob ? billedOn(eob) : 0;
  const insurancePaid = eob?.insurance_paid_cents ?? bill?.insurance_paid_cents ?? 0;
  const patientOwes =
    bill?.patient_responsibility_cents ?? eob?.patient_responsibility_cents ?? 0;
  const insuranceProcessed = Boolean(eob) || (bill?.insurance_paid_cents ?? 0) > 0;

  let status: VisitStatus;
  if (currentStatus === "disputing") status = "disputing";
  else if (!insuranceProcessed) status = "waiting_for_insurance";
  else if (patientOwes > 0) status = "to_pay";
  else status = "closed";

  return {
    billed_cents: billed,
    insurance_paid_cents: insurancePaid,
    patient_owes_cents: patientOwes,
    status,
  };
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  waiting_for_insurance: "Waiting for insurance",
  to_pay: "To pay",
  disputing: "Disputing",
  closed: "Nothing to pay",
};
