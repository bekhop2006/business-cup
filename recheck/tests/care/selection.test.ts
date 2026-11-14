import { describe, expect, it } from "vitest";
import { canCompareCare, makeSelectionEstimate } from "@/lib/care/selection";
import { EMPTY_PLAN } from "@/lib/costs/patientShare";
import { chosenProviderSchema, savedEstimateSchema } from "@/lib/schemas/providers";
import { MICHAEL_PLAN } from "../costs/helpers";
import { providerRow, routineContext } from "./provider-helpers";

describe("canCompareCare", () => {
  it("requires confirmed complete safety answers for the supported scope", () => {
    expect(canCompareCare({ intake: null })).toBe(false);
    expect(canCompareCare(routineContext())).toBe(true);
    expect(canCompareCare({ ...routineContext(), scope: "other" })).toBe(false);
    const incomplete = routineContext();
    delete incomplete.answers?.cannot_bear_weight;
    expect(canCompareCare(incomplete)).toBe(false);
    const warning = routineContext();
    warning.answers = { ...warning.answers, cannot_bear_weight: true };
    expect(canCompareCare(warning)).toBe(false);
  });
});

describe("selection estimate", () => {
  it.each([["primary_care", 5000], ["sports_medicine", 2500], ["urgent_care", 0]] as const)(
    "compares %s against Michael's $75 urgent-care visit, not a clinic quote",
    (route, savings) => {
      const snapshot = makeSelectionEstimate(route, MICHAEL_PLAN, "2026-11-15T00:00:00Z");
      expect(snapshot.comparison.estimated_savings_cents).toBe(savings);
      expect(snapshot.comparison.baseline_patient_share).toEqual({ lowCents: 7500, highCents: 7500 });
      expect(savedEstimateSchema.safeParse(snapshot).success).toBe(true);
      expect(snapshot.scenarios).toHaveLength(3);
      expect(snapshot.sources.medicare.url).toContain("cms.gov");
      expect(snapshot.sources.commercial_multiplier.isAssumption).toBe(true);
    },
  );

  it("claims no savings when unknown benefits make price ranges overlap", () => {
    const snapshot = makeSelectionEstimate("primary_care", EMPTY_PLAN);
    expect(snapshot.comparison.estimated_savings_cents).toBe(0);
  });

  it("keeps saved numbers after the profile changes", () => {
    const plan = { ...MICHAEL_PLAN, copays: { ...MICHAEL_PLAN.copays } };
    const snapshot = makeSelectionEstimate("sports_medicine", plan);
    plan.copays.specialist = 10000;
    expect(snapshot.scenarios[0].patientShare).toEqual({ lowCents: 5000, highCents: 5000 });
    expect(snapshot.insurance_profile.copays.specialist).toBe(5000);
    expect(makeSelectionEstimate("sports_medicine", plan).comparison.estimated_savings_cents).toBe(0);
  });

  it("rejects a saved provider that claims verified network participation", () => {
    expect(chosenProviderSchema.safeParse(providerRow).success).toBe(true);
    expect(chosenProviderSchema.safeParse({ ...providerRow, network_status: "in_network" }).success).toBe(false);
  });
});
