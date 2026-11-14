// What each plan includes (docs/PROJECT.md, "Business model"): the first
// visit's check is free and shows the potential savings; every other visit's
// details, the dispute letters and the yearly dashboard are on the paid plan.

export type Plan = "free" | "paid";

export const PAID_PLAN_NAME = "Recheck Plus";
export const MONTHLY_PRICE_CENTS = 999;

export function canSeeVisitChecks(plan: Plan, visitId: string, firstVisitId: string | null): boolean {
  return plan === "paid" || visitId === firstVisitId;
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
