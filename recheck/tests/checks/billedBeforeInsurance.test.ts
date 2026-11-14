import { describe, expect, it } from "vitest";
import { findBilledBeforeInsurance } from "@/lib/checks/billedBeforeInsurance";
import { bill, eob, input } from "./helpers";

describe("findBilledBeforeInsurance", () => {
  it("flags a bill with no insurance payment and no EOB", () => {
    const flags = findBilledBeforeInsurance(input([bill({ insurance_paid_cents: 0 })]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      type: "billed_before_insurance",
      document_id: "bill",
      line_item_id: null,
      potential_savings_cents: 0,
    });
    expect(findBilledBeforeInsurance(input([bill({ insurance_paid_cents: null })]))).toHaveLength(1);
  });

  it("does not flag once the EOB is here or the bill shows an insurance payment", () => {
    expect(findBilledBeforeInsurance(input([bill({ insurance_paid_cents: 0 }), eob()]))).toEqual([]);
    expect(findBilledBeforeInsurance(input([bill()]))).toEqual([]);
  });

  it("has nothing to flag without a bill", () => {
    expect(findBilledBeforeInsurance(input([eob()]))).toEqual([]);
  });
});
