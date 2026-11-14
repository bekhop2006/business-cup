import { describe, expect, it } from "vitest";
import { potentialSavings } from "@/lib/checks";
import { findTotalMismatch } from "@/lib/checks/totals";
import { bill, eob, input, line } from "./helpers";

describe("findTotalMismatch", () => {
  const lines = [line({ amount_cents: 70500 }), line({ amount_cents: 6000 })];

  it("flags a bill whose total is higher than its charges, with the gap as savings", () => {
    const flags = findTotalMismatch(input([bill({ stated_total_cents: 82500 })], lines));
    expect(flags).toEqual([
      {
        type: "total_mismatch",
        line_item_id: null,
        document_id: "bill",
        potential_savings_cents: 6000,
        message:
          "The charges on this bill add up to $765.00, but the bill's total says $825.00. That's $60.00 with no charge listed behind it, which is worth asking about.",
      },
    ]);
  });

  it("flags a total that is lower than the charges without promising savings", () => {
    const [flag] = findTotalMismatch(input([bill({ stated_total_cents: 70000 })], lines));
    expect(flag.potential_savings_cents).toBe(0);
  });

  it("does not flag a bill that adds up, has no printed total, or has no lines", () => {
    expect(findTotalMismatch(input([bill({ stated_total_cents: 76500 })], lines))).toEqual([]);
    expect(findTotalMismatch(input([bill({ stated_total_cents: null })], lines))).toEqual([]);
    expect(findTotalMismatch(input([bill({ stated_total_cents: 82500 })], []))).toEqual([]);
  });

  it("only checks bills", () => {
    const eobLines = lines.map((item) => ({ ...item, document_id: "eob" }));
    expect(findTotalMismatch(input([eob({ stated_total_cents: 1 })], eobLines))).toEqual([]);
  });
});

describe("potentialSavings", () => {
  it("does not count a duplicate line and the bill/EOB gap it causes twice", () => {
    const flags = [
      { type: "duplicate_line" as const, potential_savings_cents: 9600 },
      { type: "eob_mismatch" as const, potential_savings_cents: 9600 },
    ];
    expect(potentialSavings(flags, 39340)).toBe(9600);
  });

  it("adds up line flags and never exceeds what the person owes", () => {
    const flags = [
      { type: "duplicate_line" as const, potential_savings_cents: 9600 },
      { type: "unclear_line" as const, potential_savings_cents: 6000 },
    ];
    expect(potentialSavings(flags, 100000)).toBe(15600);
    expect(potentialSavings(flags, 5000)).toBe(5000);
    expect(potentialSavings([], 5000)).toBe(0);
  });
});
