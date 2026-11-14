import { describe, expect, it } from "vitest";
import {
  aboutYouSchema,
  aboutYouToProfile,
  estimateDetailsKnown,
  insuranceToInput,
  insuranceToProfile,
  parsePercentToBps,
  type InsuranceInput,
} from "@/lib/profile/onboarding";

const empty: InsuranceInput = {
  insurerName: "",
  planName: "",
  planType: "",
  deductible: "",
  deductibleMet: "",
  oopMax: "",
  oopMet: "",
  coinsurance: "",
  copayPrimary: "",
  copaySpecialist: "",
  copayUrgentCare: "",
  copayEr: "",
};

const michael: InsuranceInput = {
  insurerName: "UnitedHealthcare",
  planName: "Choice Plus PPO",
  planType: "PPO",
  deductible: "$1,500",
  deductibleMet: "300",
  oopMax: "6,000.00",
  oopMet: "$300",
  coinsurance: "20%",
  copayPrimary: "25",
  copaySpecialist: "$50",
  copayUrgentCare: "75",
  copayEr: "250",
};

describe("about you", () => {
  it("accepts a name, a 5-digit ZIP and an optional household size", () => {
    const parsed = aboutYouSchema.parse({ fullName: " Michael ", zipCode: "78701", householdSize: "5" });
    expect(aboutYouToProfile(parsed)).toEqual({ full_name: "Michael", zip_code: "78701", household_size: 5 });
    const noSize = aboutYouSchema.parse({ fullName: "Michael", zipCode: "78701", householdSize: "" });
    expect(aboutYouToProfile(noSize).household_size).toBeNull();
  });

  it("rejects a ZIP that is not 5 digits", () => {
    expect(aboutYouSchema.safeParse({ fullName: "M", zipCode: "7870", householdSize: "" }).success).toBe(false);
    expect(aboutYouSchema.safeParse({ fullName: "M", zipCode: "78701-1234", householdSize: "" }).success).toBe(false);
  });
});

describe("insuranceToProfile", () => {
  it("turns Michael's plan into cents and basis points", () => {
    expect(insuranceToProfile(michael)).toEqual({
      values: {
        insurer_name: "UnitedHealthcare",
        plan_name: "Choice Plus PPO",
        plan_type: "PPO",
        deductible_cents: 150000,
        deductible_met_cents: 30000,
        oop_max_cents: 600000,
        oop_met_cents: 30000,
        coinsurance_bps: 2000,
        copay_primary_cents: 2500,
        copay_specialist_cents: 5000,
        copay_urgent_care_cents: 7500,
        copay_er_cents: 25000,
      },
    });
  });

  it("keeps every unknown field empty instead of zero", () => {
    const result = insuranceToProfile(empty);
    expect(result).toMatchObject({ values: { deductible_cents: null, coinsurance_bps: null, plan_type: null } });
  });

  it("explains which amount could not be read", () => {
    expect(insuranceToProfile({ ...empty, copayEr: "lots" })).toEqual({
      error: "Check the emergency room copay: enter an amount like 1,500.",
    });
    expect(insuranceToProfile({ ...empty, coinsurance: "twenty" })).toEqual({
      error: "Check your coinsurance: enter a percent like 20.",
    });
  });

  it("rejects an amount met that is larger than the limit", () => {
    expect(insuranceToProfile({ ...empty, deductible: "1000", deductibleMet: "1500" })).toEqual({
      error: "The amount met can't be more than your deductible.",
    });
    expect(insuranceToProfile({ ...empty, oopMax: "6000", oopMet: "7000" })).toEqual({
      error: "The amount spent can't be more than your out-of-pocket maximum.",
    });
  });
});

describe("parsePercentToBps", () => {
  it("reads whole and decimal percents", () => {
    expect(parsePercentToBps("20")).toBe(2000);
    expect(parsePercentToBps("12.5%")).toBe(1250);
    expect(parsePercentToBps("0")).toBe(0);
    expect(parsePercentToBps("100 %")).toBe(10000);
  });

  it("rejects values that are not a percent", () => {
    expect(parsePercentToBps("120")).toBeNull();
    expect(parsePercentToBps("-5")).toBeNull();
    expect(parsePercentToBps("20.555")).toBeNull();
  });
});

describe("estimateDetailsKnown", () => {
  it("counts the details that shape an estimate", () => {
    const result = insuranceToProfile(michael);
    expect("values" in result && estimateDetailsKnown(result.values)).toEqual({ known: 9, total: 9 });
    expect(estimateDetailsKnown(null)).toEqual({ known: 0, total: 9 });
  });
});

describe("insuranceToInput", () => {
  it("round-trips a saved profile through the form", () => {
    const saved = insuranceToProfile(michael);
    if (!("values" in saved)) throw new Error("expected values");
    const input = insuranceToInput(saved.values);
    expect(input).toMatchObject({ deductible: "1500.00", coinsurance: "20", planType: "PPO" });
    expect(insuranceToProfile(input)).toEqual(saved);
    expect(insuranceToInput({ coinsurance_bps: 1250 }).coinsurance).toBe("12.5");
    expect(insuranceToInput(null)).toEqual(empty);
  });
});
