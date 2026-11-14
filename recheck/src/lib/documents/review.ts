import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import type { DocumentFields, LineItemDraft } from "@/lib/documents/validate";
import { DOCUMENT_TYPES } from "@/lib/schemas/extracted";
import { cleanPersonName } from "@/lib/visits/match";

// What a person checked against their paper document on the review screen.

const optionalDate = z.union([z.literal(""), z.iso.date()]);
const amountText = z.string().trim().max(20);

export const reviewedLineSchema = z.object({
  code: z.string().trim().max(20),
  description: z.string().trim().max(200),
  service_date: optionalDate,
  amount: amountText,
  quantity: z.number().int().nullable(),
});

export const reviewedDetailsSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  provider_name: z.string().trim().max(200),
  patient_name: z.string().trim().max(200),
  service_date: optionalDate,
  insurance_paid: amountText,
  patient_responsibility: amountText,
});

export const reviewSchema = z.object({
  details: reviewedDetailsSchema,
  lines: z
    .array(reviewedLineSchema)
    .min(1, "Add at least one line from your document.")
    .max(200, "That's more lines than we can save at once."),
  statedTotal: amountText,
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewedLine = z.infer<typeof reviewedLineSchema>;
export type ReviewedDetails = z.infer<typeof reviewedDetailsSchema>;

type ReviewedDocument = {
  lineItems: LineItemDraft[];
  statedTotalCents: number | null;
  fields: DocumentFields;
};

// An empty field means "not on the document"; anything else must be an amount.
function optionalAmount(text: string): { cents: number | null } | null {
  if (!text) return { cents: null };
  const cents = parseMoneyToCents(text);
  return cents === null ? null : { cents };
}

export function reviewToDocument(input: ReviewInput): ReviewedDocument | { error: string } {
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
      service_date: line.service_date || input.details.service_date || null,
      quantity: line.quantity,
      amount_cents: amountCents,
    });
  }

  const statedTotal = optionalAmount(input.statedTotal);
  if (!statedTotal) return { error: "Check the document total." };
  const insurancePaid = optionalAmount(input.details.insurance_paid);
  if (!insurancePaid) return { error: "Check the amount paid by insurance." };
  const patientOwes = optionalAmount(input.details.patient_responsibility);
  if (!patientOwes) return { error: "Check the amount you owe." };

  const { details } = input;
  return {
    lineItems,
    statedTotalCents: statedTotal.cents,
    fields: {
      type: details.type,
      provider_name: details.provider_name || null,
      patient_name: cleanPersonName(details.patient_name) || null,
      service_date: details.service_date || null,
      insurance_paid_cents: insurancePaid.cents === null ? null : Math.abs(insurancePaid.cents),
      patient_responsibility_cents: patientOwes.cents,
    },
  };
}
