import { describe, expect, it } from "vitest";
import {
  reviewToDocument,
  type ReviewInput,
  type ReviewedLine,
} from "@/lib/documents/review";

const line = (overrides: Partial<ReviewedLine> = {}): ReviewedLine => ({
  code: "99214",
  description: "Office visit",
  service_date: "2026-07-18",
  amount: "$245.00",
  quantity: 1,
  ...overrides,
});

const input = (overrides: Partial<ReviewInput> = {}): ReviewInput => ({
  details: {
    type: "bill",
    provider_name: "QuickCare Urgent Care",
    patient_name: " Jordan  Ellis ",
    service_date: "2026-07-18",
    insurance_paid: "",
    patient_responsibility: "$825.00",
  },
  lines: [line()],
  statedTotal: "",
  ...overrides,
});

describe("reviewToDocument", () => {
  it("turns checked lines and details into cents and clean fields", () => {
    const result = reviewToDocument(
      input({
        lines: [line(), line({ code: "", description: "MISC SVC 0099", amount: "60", quantity: null, service_date: "" })],
        statedTotal: "$825.00",
      }),
    );
    expect(result).toEqual({
      statedTotalCents: 82500,
      lineItems: [
        { code: "99214", description: "Office visit", service_date: "2026-07-18", quantity: 1, amount_cents: 24500 },
        { code: null, description: "MISC SVC 0099", service_date: "2026-07-18", quantity: null, amount_cents: 6000 },
      ],
      fields: {
        type: "bill",
        provider_name: "QuickCare Urgent Care",
        patient_name: "Jordan Ellis",
        service_date: "2026-07-18",
        insurance_paid_cents: null,
        patient_responsibility_cents: 82500,
      },
    });
  });

  it("stores an insurance payment as a positive amount", () => {
    const result = reviewToDocument(
      input({ details: { ...input().details, insurance_paid: "-$148.40" } }),
    );
    expect(result).toMatchObject({ fields: { insurance_paid_cents: 14840 } });
  });

  it("allows a document without a printed total", () => {
    expect(reviewToDocument(input())).toMatchObject({ statedTotalCents: null });
  });

  it("points at the line with an unreadable amount", () => {
    expect(reviewToDocument(input({ lines: [line(), line({ amount: "abc" })] }))).toEqual({
      error: "Check the amount on line 2.",
    });
  });

  it("rejects a line with neither a code nor a description", () => {
    expect(reviewToDocument(input({ lines: [line({ code: "", description: "" })] }))).toEqual({
      error: "Line 1 needs a description or a code.",
    });
  });

  it("rejects unreadable totals", () => {
    expect(reviewToDocument(input({ statedTotal: "lots" }))).toEqual({
      error: "Check the document total.",
    });
    expect(
      reviewToDocument(input({ details: { ...input().details, patient_responsibility: "?" } })),
    ).toEqual({ error: "Check the amount you owe." });
  });
});
