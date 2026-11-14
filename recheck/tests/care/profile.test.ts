import { describe, expect, it } from "vitest";
import { insuranceToCostPlan } from "@/lib/care/profile";
import { EMPTY_PLAN } from "@/lib/costs/patientShare";

describe("insuranceToCostPlan", () => {
  it("preserves unknown fields as null instead of treating them as zero", () => {
    expect(insuranceToCostPlan(null)).toEqual(EMPTY_PLAN);
    const result = insuranceToCostPlan({
      insurer_name: "UnitedHealthcare", plan_name: null, plan_type: "PPO",
      deductible_cents: 150000, deductible_met_cents: 30000,
      oop_max_cents: 600000, oop_met_cents: null, coinsurance_bps: 2000,
      copay_primary_cents: 2500, copay_specialist_cents: 5000,
      copay_urgent_care_cents: 7500, copay_er_cents: 25000,
    });
    expect(result).toMatchObject({ planType: "PPO", deductibleCents: 150000, oopMetCents: null, coinsuranceBps: 2000 });
    expect(result.copays).toEqual({ primary: 2500, specialist: 5000, urgent_care: 7500, er: 25000 });
  });
});
