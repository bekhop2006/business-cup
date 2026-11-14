import { describe, expect, it } from "vitest";
import { findEobMismatch } from "@/lib/checks/eobMismatch";
import { bill, eob, input } from "./helpers";

describe("findEobMismatch", () => {
  it("flags a bill that asks for more than the EOB says the patient owes", () => {
    const flags = findEobMismatch(input([bill(), eob()]));
    expect(flags).toEqual([
      {
        type: "eob_mismatch",
        line_item_id: null,
        document_id: "bill",
        potential_savings_cents: 9600,
        message:
          "The bill asks you to pay $393.40, but your insurer's Explanation of Benefits says your share is $297.40. That's $96.00 more than your plan says you owe, which is worth asking about.",
      },
    ]);
  });

  it("compares the newest bill and the newest EOB", () => {
    const corrected = bill({ id: "new-bill", created_at: "2026-07-01T00:00:00Z", patient_responsibility_cents: 29740 });
    expect(findEobMismatch(input([bill(), corrected, eob()]))).toEqual([]);
  });

  it("does not flag a bill that matches or asks for less than the EOB", () => {
    expect(findEobMismatch(input([bill({ patient_responsibility_cents: 29740 }), eob()]))).toEqual([]);
    expect(findEobMismatch(input([bill({ patient_responsibility_cents: 10000 }), eob()]))).toEqual([]);
  });

  it("needs both documents and both amounts", () => {
    expect(findEobMismatch(input([bill()]))).toEqual([]);
    expect(findEobMismatch(input([eob()]))).toEqual([]);
    expect(findEobMismatch(input([bill(), eob({ patient_responsibility_cents: null })]))).toEqual([]);
  });
});
