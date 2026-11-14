import { formatCents } from "@/lib/money";
import { bills, linesOf, type Check } from "@/lib/checks/types";

// Words that say nothing about what the service was.
const GENERIC_WORDS = new Set([
  "misc", "miscellaneous", "svc", "svcs", "service", "services", "chg", "chgs", "charge",
  "charges", "other", "supply", "supplies", "item", "items", "fee", "fees", "sundry",
  "general", "adj", "adjustment", "code", "see", "attached", "detail",
]);

export function isUsableDescription(description: string | null): boolean {
  const words = description?.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return words.some((word) => !GENERIC_WORDS.has(word));
}

// A line on a bill has no billing code and no description that says what it was.
export const findUnclearLines: Check = (input) =>
  bills(input).flatMap((bill) =>
    linesOf(input, bill.id)
      .filter((line) => !line.code?.trim() && !isUsableDescription(line.description))
      .map((line) => ({
        type: "unclear_line" as const,
        line_item_id: line.id,
        document_id: bill.id,
        message: `${line.description ? `"${line.description}"` : "One line"} (${formatCents(line.amount_cents)}) has no billing code and doesn't say what the service was. You have the right to ask what you're paying for.`,
        potential_savings_cents: Math.max(line.amount_cents, 0),
      })),
  );
