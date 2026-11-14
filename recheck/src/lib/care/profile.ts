import { EMPTY_PLAN, type InsurancePlan } from "@/lib/costs/patientShare";
import { PLAN_TYPES, type InsuranceProfileValues } from "@/lib/profile/onboarding";

export function insuranceToCostPlan(profile: (Omit<InsuranceProfileValues, "plan_type"> & { plan_type: string | null }) | null): InsurancePlan {
  if (!profile) return EMPTY_PLAN;
  return {
    planType: PLAN_TYPES.find((type) => type === profile.plan_type) ?? null,
    deductibleCents: profile.deductible_cents,
    deductibleMetCents: profile.deductible_met_cents,
    oopMaxCents: profile.oop_max_cents,
    oopMetCents: profile.oop_met_cents,
    coinsuranceBps: profile.coinsurance_bps,
    copays: {
      primary: profile.copay_primary_cents,
      specialist: profile.copay_specialist_cents,
      urgent_care: profile.copay_urgent_care_cents,
      er: profile.copay_er_cents,
    },
  };
}
