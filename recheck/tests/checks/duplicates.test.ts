import { describe, expect, it } from "vitest";
import { findDuplicateLines } from "@/lib/checks/duplicates";
import { bill, eob, input, line } from "./helpers";

describe("findDuplicateLines", () => {
  it("flags the repeat of a service billed twice on the same day for the same amount", () => {
    const first = line({ code: "85025", description: "Complete blood count (CBC)", amount_cents: 9600 });
    const repeat = line({ code: "85025", description: "Complete blood count (CBC)", amount_cents: 9600 });
    const flags = findDuplicateLines(input([bill()], [line(), first, repeat]));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      type: "duplicate_line",
      line_item_id: repeat.id,
      document_id: "bill",
      potential_savings_cents: 9600,
    });
    expect(flags[0].message).toContain("Complete blood count (CBC) (85025) is billed more than once on May 3, 2026, for $96.00 each");
  });

  it("matches lines without a code by their description", () => {
    const flags = findDuplicateLines(
      input([bill()], [line({ code: null, description: "Saline" }), line({ code: null, description: " saline " })]),
    );
    expect(flags).toHaveLength(1);
  });

  it("does not flag the same code on another day, for another amount, or across documents", () => {
    const flags = findDuplicateLines(
      input(
        [bill(), eob()],
        [
          line({ code: "85025", amount_cents: 9600 }),
          line({ code: "85025", amount_cents: 9600, service_date: "2026-05-04" }),
          line({ code: "85025", amount_cents: 4800 }),
          line({ code: "85025", amount_cents: 9600, document_id: "eob" }),
        ],
      ),
    );
    expect(flags).toEqual([]);
  });

  it("ignores repeats on an EOB", () => {
    const flags = findDuplicateLines(
      input([eob()], [line({ document_id: "eob" }), line({ document_id: "eob" })]),
    );
    expect(flags).toEqual([]);
  });
});
