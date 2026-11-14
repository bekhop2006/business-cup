import type { DocumentType } from "@/lib/schemas/extracted";

// Checks are pure functions over one visit: no network, no database, no LLM.

export const FLAG_TYPES = [
  "duplicate_line",
  "eob_mismatch",
  "billed_before_insurance",
  "unclear_line",
  "total_mismatch",
] as const;

export type FlagType = (typeof FLAG_TYPES)[number];

export type CheckDocument = {
  id: string;
  type: DocumentType | null;
  created_at: string;
  stated_total_cents: number | null;
  insurance_paid_cents: number | null;
  patient_responsibility_cents: number | null;
};

export type CheckLine = {
  id: string;
  document_id: string;
  code: string | null;
  description: string | null;
  service_date: string | null;
  amount_cents: number;
};

export type CheckInput = {
  documents: CheckDocument[];
  lines: CheckLine[];
};

// Every flag points at the document it is about, and at the line when it is
// about one line.
export type FlagDraft = {
  type: FlagType;
  document_id: string;
  line_item_id: string | null;
  message: string;
  potential_savings_cents: number;
};

export type Check = (input: CheckInput) => FlagDraft[];

export const newestFirst = (a: CheckDocument, b: CheckDocument) =>
  b.created_at.localeCompare(a.created_at);

export const bills = (input: CheckInput) =>
  input.documents.filter((document) => document.type === "bill");

export const linesOf = (input: CheckInput, documentId: string) =>
  input.lines.filter((line) => line.document_id === documentId);

export const lineName = (line: CheckLine) =>
  [line.description, line.code && `(${line.code})`].filter(Boolean).join(" ") || "A line";
