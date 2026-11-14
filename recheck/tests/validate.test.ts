import { describe, expect, it } from "vitest";
import { validateExtraction } from "@/lib/documents/validate";
import type { ExtractedDocument } from "@/lib/schemas/extracted";

function document(overrides: Partial<ExtractedDocument> = {}): ExtractedDocument {
  return {
    readable: true,
    document_type: "bill",
    provider_name: "Test Clinic",
    insurer_name: null,
    patient_name: null,
    service_date: "2026-03-12",
    issued_date: null,
    claim_number: null,
    account_number: null,
    line_items: [
      { code: "99213", description: "Office visit", service_date: null, quantity: 1, amount: "$185.00" },
      { code: "87880", description: "Strep test", service_date: "2026-03-13", quantity: 1, amount: "$45.00" },
    ],
    total_charges: "$230.00",
    insurance_paid: null,
    patient_responsibility: null,
    ...overrides,
  };
}

describe("validateExtraction", () => {
  it("accepts lines that add up to the stated total", () => {
    const result = validateExtraction(document());
    expect(result.problems).toEqual([]);
    expect(result.statedTotalCents).toBe(23000);
    expect(result.lineItems.map((line) => line.amount_cents)).toEqual([18500, 4500]);
  });

  it("uses the document's service date when a line has none", () => {
    const [first, second] = validateExtraction(document()).lineItems;
    expect(first.service_date).toBe("2026-03-12");
    expect(second.service_date).toBe("2026-03-13");
  });

  it("asks for review when the lines do not add up to the total", () => {
    const result = validateExtraction(document({ total_charges: "$290.00" }));
    expect(result.problems).toEqual([
      { kind: "total_mismatch", lineSumCents: 23000, statedTotalCents: 29000 },
    ]);
  });

  it("asks for review when the document could not be read", () => {
    expect(validateExtraction(null).problems).toEqual([{ kind: "unreadable" }]);
    expect(validateExtraction(document({ readable: false })).problems).toEqual([
      { kind: "unreadable" },
    ]);
  });

  it("asks for review when an amount cannot be read, and drops that line", () => {
    const result = validateExtraction(
      document({
        line_items: [
          { code: "99213", description: "Office visit", service_date: null, quantity: 1, amount: "see back" },
        ],
        total_charges: null,
      }),
    );
    expect(result.lineItems).toEqual([]);
    expect(result.problems).toEqual([{ kind: "unreadable_amount", line: "Office visit" }]);
  });

  it("asks for review when there are no lines at all", () => {
    const result = validateExtraction(document({ line_items: [], total_charges: null }));
    expect(result.problems).toEqual([{ kind: "no_line_items" }]);
  });

  it("keeps only whole-unit quantities and trims empty text", () => {
    const [line] = validateExtraction(
      document({
        line_items: [{ code: "  ", description: "Drug", service_date: null, quantity: 0.5, amount: "$10.00" }],
        total_charges: "$10.00",
      }),
    ).lineItems;
    expect(line.code).toBeNull();
    expect(line.quantity).toBeNull();
  });
});
