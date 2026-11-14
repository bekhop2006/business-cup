import type { InsurancePlan } from "@/lib/costs/patientShare";

// Demo persona Michael: UnitedHealthcare PPO, Austin TX.
export const MICHAEL_PLAN: InsurancePlan = {
  planType: "PPO",
  deductibleCents: 150_000,
  deductibleMetCents: 30_000,
  coinsuranceBps: 2_000,
  oopMaxCents: 600_000,
  oopMetCents: 30_000,
  copays: { primary: 2_500, specialist: 5_000, urgent_care: 7_500, er: 25_000 },
};

export function plan(overrides: Partial<InsurancePlan> = {}): InsurancePlan {
  return { ...MICHAEL_PLAN, ...overrides };
}
