import { formatServiceDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { bills, lineName, linesOf, type Check, type CheckLine, type FlagDraft } from "@/lib/checks/types";

// The same service (code, or description when there is no code), on the same
// date and for the same amount, appears more than once on one bill.
// Each repeat is flagged; the first occurrence is not.
const serviceKey = (line: CheckLine) => {
  const service = line.code?.trim().toUpperCase() || line.description?.trim().toLowerCase();
  return service ? `${service}|${line.service_date ?? ""}|${line.amount_cents}` : null;
};

export const findDuplicateLines: Check = (input) => {
  const flags: FlagDraft[] = [];
  for (const bill of bills(input)) {
    const seen = new Map<string, CheckLine>();
    for (const line of linesOf(input, bill.id)) {
      const key = serviceKey(line);
      if (!key) continue;
      const first = seen.get(key);
      if (!first) {
        seen.set(key, line);
        continue;
      }
      const when = line.service_date ? ` on ${formatServiceDate(line.service_date)}` : "";
      flags.push({
        type: "duplicate_line",
        line_item_id: line.id,
        document_id: bill.id,
        message: `${lineName(line)} is billed more than once${when}, for ${formatCents(line.amount_cents)} each. This looks like a duplicate charge and is worth asking about.`,
        potential_savings_cents: Math.max(line.amount_cents, 0),
      });
    }
  }
  return flags;
};
