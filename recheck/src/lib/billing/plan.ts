// What each plan includes (docs/PROJECT.md, "Business model"): the first
// care question and the first visit's check are free in full; later care
// options and forecasts, every other visit's details, the dispute letters and
// the yearly dashboard are on the paid plan. Safety questions and the
// "Get care now" warning are never behind the paywall.

export type Plan = "free" | "paid";

export const PAID_PLAN_NAME = "Recheck Plus";
export const MONTHLY_PRICE_CENTS = 999;

export function canSeeVisitChecks(plan: Plan, visitId: string, firstVisitId: string | null): boolean {
  return plan === "paid" || visitId === firstVisitId;
}

// Care options, cost forecasts and provider search for a care question.
export function canCompareCareOptions(plan: Plan, caseId: string, firstCaseId: string | null): boolean {
  return plan === "paid" || caseId === firstCaseId;
}

// "Ask Recheck": the first question is free, the rest are on the paid plan.
export function canAskQuestion(plan: Plan, questionsAsked: number): boolean {
  return plan === "paid" || questionsAsked === 0;
}

export function canWriteLetters(plan: Plan): boolean {
  return plan === "paid";
}

export function canSeeDashboard(plan: Plan): boolean {
  return plan === "paid";
}

// A Stripe subscription keeps the paid plan while it is active or trialing.
// Every other status (canceled, unpaid, past_due, incomplete…) means free.
export function planForSubscriptionStatus(status: string): Plan {
  return status === "active" || status === "trialing" ? "paid" : "free";
}
