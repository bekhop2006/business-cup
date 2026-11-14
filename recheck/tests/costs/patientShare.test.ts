import { describe, expect, it } from "vitest";
import { EMPTY_PLAN, estimatePatientShare } from "@/lib/costs/patientShare";
import { MICHAEL_PLAN, plan } from "./helpers";

describe("estimatePatientShare with a known copay", () => {
  it("charges Michael his $50 specialist copay for a visit that costs more", () => {
    const share = estimatePatientShare({ allowedCents: 13_873, plan: MICHAEL_PLAN, copayKind: "specialist" });
    expect(share).toMatchObject({ lowCents: 5_000, highCents: 5_000, method: "copay", confidence: "high", unknowns: [] });
    expect(share.assumptions.join(" ")).toContain("$50.00 copay");
  });

  it("charges the visit price when it is less than the copay", () => {
    const share = estimatePatientShare({ allowedCents: 13_952, plan: MICHAEL_PLAN, copayKind: "er" });
    expect(share).toMatchObject({ lowCents: 13_952, highCents: 13_952, method: "copay" });
  });

  it("sends extras through the deductible, not the copay", () => {
    const share = estimatePatientShare({
      allowedCents: 13_873,
      extrasAllowedCents: 5_006,
      plan: MICHAEL_PLAN,
      copayKind: "specialist",
    });
    // $50 copay + the X-ray, all of it still inside his $1,200 remaining deductible.
    expect(share).toMatchObject({ lowCents: 10_006, highCents: 10_006, confidence: "high" });
  });

  it("widens the range on a high-deductible plan", () => {
    const share = estimatePatientShare({
      allowedCents: 13_873,
      plan: plan({ planType: "HDHP" }),
      copayKind: "specialist",
    });
    expect(share).toMatchObject({ lowCents: 5_000, highCents: 13_873, method: "copay" });
  });
});

describe("estimatePatientShare through the deductible and coinsurance", () => {
  it("fills the remaining deductible first, then applies coinsurance", () => {
    const share = estimatePatientShare({
      allowedCents: 10_000,
      plan: plan({ deductibleCents: 50_000, deductibleMetCents: 49_000 }),
      copayKind: null,
    });
    // $10 to the deductible, then 20% of the other $90.
    expect(share).toMatchObject({ lowCents: 2_800, highCents: 2_800, method: "deductible_and_coinsurance" });
  });

  it("applies only coinsurance once the deductible is met", () => {
    const share = estimatePatientShare({
      allowedCents: 20_441,
      plan: plan({ deductibleMetCents: 150_000 }),
      copayKind: null,
    });
    expect(share.lowCents).toBe(4_088);
  });

  it("never goes past the out-of-pocket maximum", () => {
    const share = estimatePatientShare({
      allowedCents: 36_589,
      plan: plan({ oopMaxCents: 600_000, oopMetCents: 590_000 }),
      copayKind: null,
    });
    expect(share).toMatchObject({ lowCents: 10_000, highCents: 10_000 });
    const reached = estimatePatientShare({ allowedCents: 36_589, plan: plan({ oopMetCents: 600_000 }), copayKind: null });
    expect(reached.highCents).toBe(0);
  });

  it("uses the deductible path and says so when no copay is entered", () => {
    const share = estimatePatientShare({
      allowedCents: 13_873,
      plan: plan({ copays: { ...MICHAEL_PLAN.copays, specialist: null } }),
      copayKind: "specialist",
    });
    expect(share).toMatchObject({ lowCents: 13_873, highCents: 13_873, method: "deductible_and_coinsurance" });
    expect(share.confidence).toBe("medium");
    expect(share.unknowns).toEqual(["Your copay for specialist visits."]);
  });
});

describe("estimatePatientShare with missing plan details", () => {
  it("gives the full possible range for an empty profile", () => {
    const share = estimatePatientShare({ allowedCents: 13_873, plan: EMPTY_PLAN, copayKind: "specialist" });
    expect(share).toMatchObject({ lowCents: 0, highCents: 13_873, confidence: "low" });
    expect(share.unknowns).toHaveLength(4);
  });

  it("widens the range when only the deductible paid so far is unknown", () => {
    const share = estimatePatientShare({
      allowedCents: 10_000,
      plan: plan({ deductibleMetCents: null }),
      copayKind: null,
    });
    // Deductible met: 20% = $20. Nothing met yet: the whole $100.
    expect(share).toMatchObject({ lowCents: 2_000, highCents: 10_000, confidence: "medium" });
  });

  it("allows $0 at the low end when progress to the out-of-pocket max is unknown", () => {
    const share = estimatePatientShare({ allowedCents: 10_000, plan: plan({ oopMetCents: null }), copayKind: null });
    expect(share).toMatchObject({ lowCents: 0, highCents: 10_000, confidence: "medium" });
  });

  it("always states the in-network assumption", () => {
    const share = estimatePatientShare({ allowedCents: 1, plan: EMPTY_PLAN, copayKind: null });
    expect(share.assumptions[0]).toContain("in your plan's network");
  });
});

describe("estimatePatientShare input checks", () => {
  it("rejects amounts that aren't whole, non-negative cents", () => {
    expect(() => estimatePatientShare({ allowedCents: -1, plan: MICHAEL_PLAN, copayKind: null })).toThrow(RangeError);
    expect(() => estimatePatientShare({ allowedCents: 10.5, plan: MICHAEL_PLAN, copayKind: null })).toThrow(RangeError);
    expect(() =>
      estimatePatientShare({ allowedCents: 100, plan: plan({ deductibleCents: -5 }), copayKind: null }),
    ).toThrow(RangeError);
  });

  it("rejects coinsurance outside 0-100%", () => {
    expect(() =>
      estimatePatientShare({ allowedCents: 100, plan: plan({ coinsuranceBps: 10_001 }), copayKind: null }),
    ).toThrow(RangeError);
  });
});
