import { describe, expect, it } from "vitest";
import { findUnclearLines, isUsableDescription } from "@/lib/checks/unclearLine";
import { bill, eob, input, line } from "./helpers";

describe("isUsableDescription", () => {
  it("rejects descriptions made only of generic words and numbers", () => {
    expect(isUsableDescription("MISC SVC 0099")).toBe(false);
    expect(isUsableDescription("Other charges")).toBe(false);
    expect(isUsableDescription("SVC")).toBe(false);
    expect(isUsableDescription(null)).toBe(false);
  });

  it("accepts descriptions that name the service", () => {
    expect(isUsableDescription("Walking boot, pneumatic")).toBe(true);
    expect(isUsableDescription("Misc supply: saline")).toBe(true);
  });
});

describe("findUnclearLines", () => {
  it("flags a bill line with no code and no usable description", () => {
    const unclear = line({ code: null, description: "MISC SVC 0099", amount_cents: 6000 });
    const flags = findUnclearLines(input([bill()], [line(), unclear]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      type: "unclear_line",
      line_item_id: unclear.id,
      document_id: "bill",
      potential_savings_cents: 6000,
    });
    expect(flags[0].message).toContain('"MISC SVC 0099" ($60.00) has no billing code');
  });

  it("does not flag a line with a code, or a clear description, or a line on an EOB", () => {
    const flags = findUnclearLines(
      input(
        [bill(), eob()],
        [
          line({ code: "99999", description: "MISC" }),
          line({ code: null, description: "Crutches" }),
          line({ code: null, description: "MISC", document_id: "eob" }),
        ],
      ),
    );
    expect(flags).toEqual([]);
  });
});
