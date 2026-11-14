import { describe, expect, it } from "vitest";
import { estimatedCareSavingsCents } from "@/lib/dashboard/home";

describe("estimatedCareSavingsCents", () => {
  const chosen = { name: "Austin Sports Medicine" };

  it("adds the saved estimates of care questions where a provider was chosen", () => {
    expect(estimatedCareSavingsCents([
      { chosen_provider: chosen, estimated_savings_cents: 5000 },
      { chosen_provider: chosen, estimated_savings_cents: 2500 },
    ])).toBe(7500);
  });

  it("ignores questions without a choice and never counts a negative difference", () => {
    expect(estimatedCareSavingsCents([
      { chosen_provider: null, estimated_savings_cents: 5000 },
      { chosen_provider: chosen, estimated_savings_cents: -2500 },
      { chosen_provider: chosen, estimated_savings_cents: null },
    ])).toBe(0);
  });

  it("is zero with no care questions", () => {
    expect(estimatedCareSavingsCents([])).toBe(0);
  });
});
