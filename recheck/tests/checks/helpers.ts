import type { CheckDocument, CheckInput, CheckLine } from "@/lib/checks/types";

export function bill(overrides: Partial<CheckDocument> = {}): CheckDocument {
  return {
    id: "bill",
    type: "bill",
    created_at: "2026-06-10T00:00:00Z",
    stated_total_cents: null,
    insurance_paid_cents: 118960,
    patient_responsibility_cents: 39340,
    ...overrides,
  };
}

export function eob(overrides: Partial<CheckDocument> = {}): CheckDocument {
  return {
    id: "eob",
    type: "eob",
    created_at: "2026-05-24T00:00:00Z",
    stated_total_cents: null,
    insurance_paid_cents: 118960,
    patient_responsibility_cents: 29740,
    ...overrides,
  };
}

let nextLine = 0;
export function line(overrides: Partial<CheckLine> = {}): CheckLine {
  nextLine += 1;
  return {
    id: `line-${nextLine}`,
    document_id: "bill",
    code: "99284",
    description: "Emergency department visit",
    service_date: "2026-05-03",
    amount_cents: 145000,
    ...overrides,
  };
}

export const input = (documents: CheckDocument[], lines: CheckLine[] = []): CheckInput => ({
  documents,
  lines,
});
