import { formatCents, parseMoneyToCents, sumCents } from "@/lib/money";
import type { ExtractedDocument } from "@/lib/schemas/extracted";

// Pipeline step 3: turn the LLM's printed values into cents and decide whether
// a person needs to look at the result before we trust it.

export type LineItemDraft = {
  code: string | null;
  description: string | null;
  service_date: string | null;
  quantity: number | null;
  amount_cents: number;
};

export type ReviewProblem =
  | { kind: "unreadable" }
  | { kind: "no_line_items" }
  | { kind: "unreadable_amount"; line: string }
  | { kind: "total_mismatch"; lineSumCents: number; statedTotalCents: number };

export type ValidatedExtraction = {
  lineItems: LineItemDraft[];
  statedTotalCents: number | null;
  problems: ReviewProblem[];
};

const clean = (text: string | null) => text?.trim() || null;

export function validateExtraction(
  extracted: ExtractedDocument | null,
): ValidatedExtraction {
  if (!extracted || !extracted.readable) {
    return { lineItems: [], statedTotalCents: null, problems: [{ kind: "unreadable" }] };
  }

  const lineItems: LineItemDraft[] = [];
  const problems: ReviewProblem[] = [];

  for (const line of extracted.line_items) {
    const amountCents = line.amount === null ? null : parseMoneyToCents(line.amount);
    if (amountCents === null) {
      problems.push({
        kind: "unreadable_amount",
        line: clean(line.description) ?? clean(line.code) ?? "one line",
      });
      continue;
    }
    lineItems.push({
      code: clean(line.code),
      description: clean(line.description),
      service_date: line.service_date ?? extracted.service_date,
      quantity: Number.isInteger(line.quantity) ? line.quantity : null,
      amount_cents: amountCents,
    });
  }

  if (lineItems.length === 0 && problems.length === 0) {
    problems.push({ kind: "no_line_items" });
  }

  const statedTotalCents =
    extracted.total_charges === null ? null : parseMoneyToCents(extracted.total_charges);
  problems.push(...findTotalMismatch(lineItems, statedTotalCents));

  return { lineItems, statedTotalCents, problems };
}

export function findTotalMismatch(
  lineItems: { amount_cents: number }[],
  statedTotalCents: number | null,
): ReviewProblem[] {
  if (statedTotalCents === null || lineItems.length === 0) return [];
  const lineSumCents = sumCents(lineItems.map((line) => line.amount_cents));
  return lineSumCents === statedTotalCents
    ? []
    : [{ kind: "total_mismatch", lineSumCents, statedTotalCents }];
}

export function describeProblem(problem: ReviewProblem): string {
  switch (problem.kind) {
    case "unreadable":
      return "We couldn't read this document. A sharper photo, taken in good light, usually fixes this.";
    case "no_line_items":
      return "We didn't find any charges on this document.";
    case "unreadable_amount":
      return `We couldn't read the amount for "${problem.line}".`;
    case "total_mismatch":
      return `The lines we read add up to ${formatCents(problem.lineSumCents)}, but the document's total says ${formatCents(problem.statedTotalCents)}.`;
  }
}
