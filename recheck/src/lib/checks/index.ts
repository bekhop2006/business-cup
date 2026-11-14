import { findBilledBeforeInsurance } from "@/lib/checks/billedBeforeInsurance";
import { findDuplicateLines } from "@/lib/checks/duplicates";
import { findEobMismatch } from "@/lib/checks/eobMismatch";
import { findTotalMismatch } from "@/lib/checks/totals";
import type { CheckInput, FlagDraft, FlagType } from "@/lib/checks/types";
import { findUnclearLines } from "@/lib/checks/unclearLine";
import { sumCents } from "@/lib/money";

const CHECKS = [
  findDuplicateLines,
  findEobMismatch,
  findBilledBeforeInsurance,
  findUnclearLines,
  findTotalMismatch,
];

// Pipeline step 5: every flag on a visit comes from here.
export function runChecks(input: CheckInput): FlagDraft[] {
  return CHECKS.flatMap((check) => check(input));
}

const LINE_FLAGS: FlagType[] = ["duplicate_line", "unclear_line"];

// How much the person may save on a visit, without counting the same money
// twice: a duplicate line and the bill/EOB gap it causes are one overcharge.
// Line flags add up; document flags overlap them, so the larger side counts,
// and it can never be more than the person is being asked to pay.
export function potentialSavings(
  flags: { type: FlagType; potential_savings_cents: number }[],
  patientOwesCents: number,
): number {
  const lineSide = sumCents(
    flags.filter((flag) => LINE_FLAGS.includes(flag.type)).map((flag) => flag.potential_savings_cents),
  );
  const documentSide = Math.max(
    0,
    ...flags.filter((flag) => !LINE_FLAGS.includes(flag.type)).map((flag) => flag.potential_savings_cents),
  );
  return Math.max(0, Math.min(Math.max(lineSide, documentSide), patientOwesCents));
}

export const FLAG_TITLES: Record<FlagType, string> = {
  duplicate_line: "Possible duplicate charge",
  eob_mismatch: "Bill asks for more than your insurer says",
  billed_before_insurance: "Billed before insurance",
  unclear_line: "Unclear charge",
  total_mismatch: "Total doesn't add up",
};
