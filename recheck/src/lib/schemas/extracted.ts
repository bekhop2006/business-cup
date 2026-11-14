import { z } from "zod";

// What the LLM returns for one uploaded document. Amounts are copied exactly as
// printed; code converts them to cents (src/lib/money.ts) and does all math.

export const DOCUMENT_TYPES = ["bill", "eob", "receipt", "other"] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date as YYYY-MM-DD");

const printedAmount = z
  .string()
  .describe('Amount exactly as printed, for example "$1,450.00" or "-$148.40"');

export const extractedLineItemSchema = z.object({
  code: z
    .string()
    .nullable()
    .describe("CPT, HCPCS or revenue code exactly as printed; null if the line has no code"),
  description: z.string().nullable().describe("Service description as printed"),
  service_date: isoDate.nullable(),
  quantity: z.number().nullable().describe("Units as printed; null if not printed"),
  amount: printedAmount
    .nullable()
    .describe("The charge for this line as printed. On an EOB, the amount billed by the provider."),
});

export const extractedDocumentSchema = z.object({
  readable: z
    .boolean()
    .describe("false if the document is too blurry, cut off, or not a medical bill, EOB or receipt"),
  document_type: z.enum(DOCUMENT_TYPES),
  provider_name: z
    .string()
    .nullable()
    .describe("Hospital, clinic or doctor that provided the care"),
  insurer_name: z.string().nullable(),
  patient_name: z.string().nullable(),
  service_date: isoDate.nullable().describe("First date of service"),
  issued_date: isoDate
    .nullable()
    .describe("Statement date on a bill, date processed on an EOB"),
  claim_number: z.string().nullable(),
  account_number: z.string().nullable(),
  line_items: z.array(extractedLineItemSchema),
  total_charges: printedAmount.nullable().describe("Printed total of all charges"),
  insurance_paid: printedAmount.nullable().describe("Printed total paid by the insurance plan"),
  patient_responsibility: printedAmount
    .nullable()
    .describe("What the patient owes according to this document"),
});

export type ExtractedDocument = z.infer<typeof extractedDocumentSchema>;
export type ExtractedLineItem = z.infer<typeof extractedLineItemSchema>;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
