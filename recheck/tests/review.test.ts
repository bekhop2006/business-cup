import { describe, expect, it } from "vitest";
import { reviewToLineItems, type ReviewedLine } from "@/lib/documents/review";

const line = (overrides: Partial<ReviewedLine> = {}): ReviewedLine => ({
  code: "99214",
  description: "Office visit",
  service_date: "2026-07-18",
  amount: "$245.00",
  quantity: 1,
  ...overrides,
});

describe("reviewToLineItems", () => {
  it("turns checked lines into cents", () => {
    const result = reviewToLineItems({
      lines: [line(), line({ code: "", description: "MISC SVC 0099", amount: "60", quantity: null })],
      statedTotal: "$825.00",
    });
    expect(result).toEqual({
      statedTotalCents: 82500,
      lineItems: [
        { code: "99214", description: "Office visit", service_date: "2026-07-18", quantity: 1, amount_cents: 24500 },
        { code: null, description: "MISC SVC 0099", service_date: "2026-07-18", quantity: null, amount_cents: 6000 },
      ],
    });
  });

  it("allows a document without a printed total", () => {
    expect(reviewToLineItems({ lines: [line()], statedTotal: "" })).toMatchObject({
      statedTotalCents: null,
    });
  });

  it("points at the line with an unreadable amount", () => {
    expect(
      reviewToLineItems({ lines: [line(), line({ amount: "abc" })], statedTotal: "" }),
    ).toEqual({ error: "Check the amount on line 2." });
  });

  it("rejects a line with neither a code nor a description", () => {
    expect(
      reviewToLineItems({ lines: [line({ code: "", description: "" })], statedTotal: "" }),
    ).toEqual({ error: "Line 1 needs a description or a code." });
  });

  it("rejects an unreadable total", () => {
    expect(reviewToLineItems({ lines: [line()], statedTotal: "lots" })).toEqual({
      error: "Check the document total.",
    });
  });
});
