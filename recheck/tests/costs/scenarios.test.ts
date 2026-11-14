import { describe, expect, it } from "vitest";
import { CARE_ROUTES } from "@/lib/care/routes";
import { HOSPITAL_FEE_NOT_INCLUDED } from "@/lib/costs/benchmarks";
import { EMPTY_PLAN } from "@/lib/costs/patientShare";
import { forecastScenarios, NOT_A_RECOMMENDATION, PRICE_ASSUMPTION } from "@/lib/costs/scenarios";
import { MICHAEL_PLAN } from "./helpers";

describe("forecastScenarios for Michael at a sports medicine doctor", () => {
  const [visit, xray, mri] = forecastScenarios(CARE_ROUTES.sports_medicine, MICHAEL_PLAN);

  it("returns visit only, visit + X-ray and visit + MRI", () => {
    expect([visit.id, xray.id, mri.id]).toEqual(["visit", "visit_xray", "visit_mri"]);
    expect(xray.items.map((item) => item.cpt)).toEqual(["99203", "73562"]);
    expect(mri.items.map((item) => item.cpt)).toEqual(["99203", "73721"]);
  });

  it("prices the visit at his $50 specialist copay", () => {
    expect(visit.medicareCents).toBe(11_757);
    expect(visit.benchmark).toEqual({ lowCents: 13_873, highCents: 21_045 });
    expect(visit.patientShare).toEqual({ lowCents: 5_000, highCents: 5_000 });
    expect(visit.confidence).toBe("high");
  });

  it("adds the X-ray through his remaining $1,200 deductible", () => {
    expect(xray.medicareCents).toBe(15_999);
    expect(xray.benchmark).toEqual({ lowCents: 18_879, highCents: 28_638 });
    expect(xray.patientShare).toEqual({ lowCents: 10_006, highCents: 12_593 });
  });

  it("adds the MRI through his remaining deductible", () => {
    expect(mri.medicareCents).toBe(32_198);
    expect(mri.benchmark).toEqual({ lowCents: 37_993, highCents: 57_634 });
    expect(mri.patientShare).toEqual({ lowCents: 29_120, highCents: 41_589 });
  });

  it("says the add-ons are not a recommendation and labels the price assumption", () => {
    for (const scenario of [visit, xray, mri]) {
      expect(scenario.note).toBe(NOT_A_RECOMMENDATION);
      expect(scenario.assumptions).toContain(PRICE_ASSUMPTION);
      expect(scenario.notIncluded.length).toBeGreaterThan(0);
    }
    expect(PRICE_ASSUMPTION).toContain("118% to 179%");
  });

  it("does not claim the hospital fee is included for an office visit", () => {
    expect(visit.notIncluded).not.toContain(HOSPITAL_FEE_NOT_INCLUDED);
  });
});

describe("forecastScenarios at the emergency room", () => {
  const [visit, xray] = forecastScenarios(CARE_ROUTES.emergency_room, MICHAEL_PLAN);

  it("uses the ER doctor's fee and caps the $250 copay at that price", () => {
    expect(visit.items[0]).toMatchObject({ cpt: "99284", medicareCents: 11_824 });
    expect(visit.patientShare).toEqual({ lowCents: 13_952, highCents: 21_165 });
  });

  it("prices only the doctor's reading of an X-ray done in the hospital", () => {
    expect(xray.items[1]).toMatchObject({ cpt: "73562", medicareCents: 935 });
    expect(xray.patientShare).toEqual({ lowCents: 15_055, highCents: 22_839 });
  });

  it("says the hospital facility fee is not included", () => {
    expect(visit.notIncluded).toContain(HOSPITAL_FEE_NOT_INCLUDED);
    expect(visit.assumptions.join(" ")).toContain("up to your full ER copay");
  });
});

describe("forecastScenarios with an empty insurance profile", () => {
  const [visit, , mri] = forecastScenarios(CARE_ROUTES.urgent_care, EMPTY_PLAN);

  it("shows the full possible range with low confidence", () => {
    expect(visit.patientShare).toEqual({ lowCents: 0, highCents: 21_045 });
    expect(mri.patientShare).toEqual({ lowCents: 0, highCents: 57_634 });
    expect(visit.confidence).toBe("low");
    expect(visit.unknowns).toContain("Your copay for urgent care visits.");
  });
});
