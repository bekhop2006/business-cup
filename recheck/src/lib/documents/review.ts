import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import type { LineItemDraft } from "@/lib/documents/validate";

// Lines a person checked against their paper document on the review screen.

export const reviewedLineSchema = z.object({
  code: z.string().trim().max(20),
  description: z.string().trim().max(200),
  service_date: z.union([z.literal(""), z.iso.date()]),
  amount: z.string().trim().max(20),
  quantity: z.number().int().nullable(),
});

export const reviewSchema = z.object({
  lines: z
    .array(reviewedLineSchema)
    .min(1, "Add at least one line from your document.")
    .max(200, "That's more lines than we can save at once."),
  statedTotal: z.string().trim().max(20),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewedLine = z.infer<typeof reviewedLineSchema>;

export function reviewToLineItems(
  input: ReviewInput,
): { lineItems: LineItemDraft[]; statedTotalCents: number | null } | { error: string } {
  const lineItems: LineItemDraft[] = [];

  for (const [index, line] of input.lines.entries()) {
    const amountCents = parseMoneyToCents(line.amount);
    if (amountCents === null) return { error: `Check the amount on line ${index + 1}.` };
    if (!line.code && !line.description) {
      return { error: `Line ${index + 1} needs a description or a code.` };
    }
    lineItems.push({
      code: line.code || null,
      description: line.description || null,
      service_date: line.service_date || null,
      quantity: line.quantity,
      amount_cents: amountCents,
    });
  }

  if (!input.statedTotal) return { lineItems, statedTotalCents: null };
  const statedTotalCents = parseMoneyToCents(input.statedTotal);
  if (statedTotalCents === null) return { error: "Check the document total." };
  return { lineItems, statedTotalCents };
}
