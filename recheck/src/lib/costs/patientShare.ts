import type { CopayKind } from "@/lib/care/routes";
import { applyBps, BPS_PER_WHOLE } from "@/lib/costs/bps";
import { formatCents } from "@/lib/money";

// What the patient may pay for a service under their own plan. Pure
// arithmetic on the user's insurance profile; every value is integer cents
// (coinsurance in basis points). A field the user left empty (null) is not
// guessed: it widens the low/high range and is listed in `unknowns`.

export type PlanType = "PPO" | "HMO" | "EPO" | "POS" | "HDHP" | "other";

export type InsurancePlan = {
  planType: PlanType | null;
  deductibleCents: number | null;
  deductibleMetCents: number | null;
  coinsuranceBps: number | null;
  oopMaxCents: number | null;
  oopMetCents: number | null;
  copays: Record<CopayKind, number | null>;
};

export const EMPTY_PLAN: InsurancePlan = {
  planType: null,
  deductibleCents: null,
  deductibleMetCents: null,
  coinsuranceBps: null,
  oopMaxCents: null,
  oopMetCents: null,
  copays: { primary: null, specialist: null, urgent_care: null, er: null },
};

export type Confidence = "high" | "medium" | "low";

export type PatientShareInput = {
  // What the plan allows for the visit or service itself.
  allowedCents: number;
  plan: InsurancePlan;
  // Which copay applies to `allowedCents`; null when no copay applies.
  copayKind: CopayKind | null;
  // Tests or imaging billed alongside, such as an X-ray. These always go
  // through the deductible and coinsurance, never the visit copay.
  extrasAllowedCents?: number;
};

export type PatientShareEstimate = {
  lowCents: number;
  highCents: number;
  method: "copay" | "deductible_and_coinsurance";
  // "high": nothing needed was missing. "medium": one thing. "low": more.
  confidence: Confidence;
  assumptions: string[];
  unknowns: string[];
};

const COPAY_NAMES: Record<CopayKind, string> = {
  primary: "primary care visits",
  specialist: "specialist visits",
  urgent_care: "urgent care visits",
  er: "ER visits",
};

export const IN_NETWORK_ASSUMPTION = "We assumed the provider is in your plan's network.";

type Range = { low: number; high: number };

function exactly(value: number): Range {
  return { low: value, high: value };
}

// Deductible still to pay this year. Unknown: anywhere from nothing left to
// enough to cover the whole amount.
function deductibleLeft(plan: InsurancePlan, unknowns: Set<string>): Range {
  if (plan.deductibleCents === null) {
    unknowns.add("Your deductible.");
    return { low: 0, high: Infinity };
  }
  if (plan.deductibleMetCents === null) {
    unknowns.add("How much of your deductible you've already paid this year.");
    return { low: 0, high: plan.deductibleCents };
  }
  return exactly(Math.max(0, plan.deductibleCents - plan.deductibleMetCents));
}

function coinsurance(plan: InsurancePlan, unknowns: Set<string>): Range {
  if (plan.coinsuranceBps === null) {
    unknowns.add("Your coinsurance (the percent you pay after the deductible).");
    return { low: 0, high: BPS_PER_WHOLE };
  }
  return exactly(plan.coinsuranceBps);
}

// Room left under the out-of-pocket maximum. Unknown: you might already have
// reached it (pay $0) or have no cap that matters here.
function outOfPocketLeft(plan: InsurancePlan, unknowns: Set<string>): Range {
  if (plan.oopMaxCents === null) {
    unknowns.add("Your out-of-pocket maximum.");
    return { low: 0, high: Infinity };
  }
  if (plan.oopMetCents === null) {
    unknowns.add("How much you've paid toward your out-of-pocket maximum this year.");
    return { low: 0, high: plan.oopMaxCents };
  }
  return exactly(Math.max(0, plan.oopMaxCents - plan.oopMetCents));
}

// The patient's share for one way the plan may treat the visit. Each input
// moves the share in one direction, so the low and high ends of every range
// give the low and high share.
function shareRange(
  visitCents: number,
  extrasCents: number,
  copay: number | null,
  plan: InsurancePlan,
  unknowns: Set<string>,
): Range {
  const copayPart = copay === null ? 0 : Math.min(copay, visitCents);
  const throughDeductible = (copay === null ? visitCents : 0) + extrasCents;
  const oop = outOfPocketLeft(plan, unknowns);
  if (throughDeductible === 0) {
    return { low: Math.min(copayPart, oop.low), high: Math.min(copayPart, oop.high) };
  }

  const deductible = deductibleLeft(plan, unknowns);
  const rate = coinsurance(plan, unknowns);
  const pay = (deductibleRemaining: number, bps: number, oopRemaining: number) => {
    const toDeductible = Math.min(throughDeductible, deductibleRemaining);
    const coinsurancePart = applyBps(throughDeductible - toDeductible, bps);
    return Math.min(copayPart + toDeductible + coinsurancePart, oopRemaining);
  };
  return {
    low: pay(deductible.low, rate.low, oop.low),
    high: pay(deductible.high, rate.high, oop.high),
  };
}

function assertCents(value: number | null, name: string): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError(`${name} must be a non-negative whole number of cents`);
  }
}

function assertPlan(plan: InsurancePlan): void {
  assertCents(plan.deductibleCents, "deductibleCents");
  assertCents(plan.deductibleMetCents, "deductibleMetCents");
  assertCents(plan.oopMaxCents, "oopMaxCents");
  assertCents(plan.oopMetCents, "oopMetCents");
  for (const [kind, copay] of Object.entries(plan.copays)) assertCents(copay, `copays.${kind}`);
  const bps = plan.coinsuranceBps;
  if (bps !== null && (!Number.isInteger(bps) || bps < 0 || bps > BPS_PER_WHOLE)) {
    throw new RangeError("coinsuranceBps must be a whole number from 0 to 10000");
  }
}

function confidenceFor(unknownCount: number): Confidence {
  if (unknownCount === 0) return "high";
  return unknownCount === 1 ? "medium" : "low";
}

// Rules, in order:
// 1. A known copay for this kind of visit: the patient pays the copay or the
//    allowed amount, whichever is less, and the deductible doesn't apply
//    (an assumption; many plans work this way for office visits).
// 2. Otherwise the amount goes to the remaining deductible first, then the
//    coinsurance percent applies to the rest.
// 3. Extras always follow rule 2. The total never exceeds what's left under
//    the out-of-pocket maximum.
export function estimatePatientShare(input: PatientShareInput): PatientShareEstimate {
  const { allowedCents, plan, copayKind, extrasAllowedCents = 0 } = input;
  assertCents(allowedCents, "allowedCents");
  assertCents(extrasAllowedCents, "extrasAllowedCents");
  assertPlan(plan);

  const assumptions = [IN_NETWORK_ASSUMPTION];
  const unknowns = new Set<string>();
  const copay = copayKind === null ? null : plan.copays[copayKind];

  if (copayKind !== null && copay === null) {
    unknowns.add(`Your copay for ${COPAY_NAMES[copayKind]}.`);
    assumptions.push("No copay was entered for this kind of visit, so we assumed it goes through your deductible and coinsurance.");
  }
  if (copayKind !== null && copay !== null) {
    assumptions.push(
      `We assumed your ${formatCents(copay)} copay covers the visit itself and the deductible doesn't apply to it. If the visit costs less than the copay, you pay the lower amount. Many plans work this way; check yours.`,
    );
  }
  if (extrasAllowedCents > 0) {
    assumptions.push("Tests and imaging usually go through your deductible and coinsurance, not your visit copay.");
  }

  let range = shareRange(allowedCents, extrasAllowedCents, copay, plan, unknowns);
  if (copay !== null && plan.planType === "HDHP") {
    // On high-deductible plans the copay often starts only after the
    // deductible is met, so we show both cases.
    const beforeDeductible = shareRange(allowedCents, extrasAllowedCents, null, plan, unknowns);
    range = {
      low: Math.min(range.low, beforeDeductible.low),
      high: Math.max(range.high, beforeDeductible.high),
    };
    assumptions.push("On high-deductible plans, copays often start only after the deductible is met, so the range covers both cases.");
  }

  return {
    lowCents: range.low,
    highCents: range.high,
    method: copay === null ? "deductible_and_coinsurance" : "copay",
    confidence: confidenceFor(unknowns.size),
    assumptions,
    unknowns: [...unknowns],
  };
}
