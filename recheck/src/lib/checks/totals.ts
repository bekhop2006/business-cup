import { formatCents, sumCents } from "@/lib/money";
import { bills, linesOf, type Check } from "@/lib/checks/types";

// The lines on a bill do not add up to the total printed on it. When the
// printed total is higher, the difference is money with no line behind it.
export const findTotalMismatch: Check = (input) =>
  bills(input).flatMap((bill) => {
    const lines = linesOf(input, bill.id);
    if (bill.stated_total_cents === null || lines.length === 0) return [];
    const lineSum = sumCents(lines.map((line) => line.amount_cents));
    if (lineSum === bill.stated_total_cents) return [];

    const difference = bill.stated_total_cents - lineSum;
    return [
      {
        type: "total_mismatch" as const,
        line_item_id: null,
        document_id: bill.id,
        message: `The charges on this bill add up to ${formatCents(lineSum)}, but the bill's total says ${formatCents(bill.stated_total_cents)}. ${
          difference > 0
            ? `That's ${formatCents(difference)} with no charge listed behind it, which is worth asking about.`
            : "The total is lower than the charges, which is worth asking the provider to explain."
        }`,
        potential_savings_cents: Math.max(difference, 0),
      },
    ];
  });
