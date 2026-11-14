import { describe, expect, it } from "vitest";
import { CARE_ROUTES, KNEE_ADD_ONS } from "@/lib/care/routes";
import { isBenchmarkCpt, MEDICARE_BENCHMARKS } from "@/lib/costs/benchmarks";

describe("CARE_ROUTES", () => {
  it("keys every route by its own id", () => {
    for (const [key, route] of Object.entries(CARE_ROUTES)) expect(route.id).toBe(key);
  });

  it("maps each route to its copay and billing setting", () => {
    expect(CARE_ROUTES.primary_care).toMatchObject({ copayKind: "primary", setting: "office" });
    expect(CARE_ROUTES.sports_medicine).toMatchObject({ copayKind: "specialist", setting: "office" });
    expect(CARE_ROUTES.urgent_care).toMatchObject({ copayKind: "urgent_care", setting: "office" });
    expect(CARE_ROUTES.emergency_room).toMatchObject({ copayKind: "er", setting: "facility" });
  });

  it("uses a visit code that has a Medicare benchmark in the route's setting", () => {
    for (const route of Object.values(CARE_ROUTES)) {
      const cpt = route.visit.cpt;
      expect(isBenchmarkCpt(cpt)).toBe(true);
      if (!isBenchmarkCpt(cpt)) continue;
      expect(MEDICARE_BENCHMARKS[cpt][route.setting]).not.toBeNull();
      expect(route.visit.why).toContain(cpt);
    }
    expect(CARE_ROUTES.emergency_room.visit.cpt).toBe("99284");
  });

  it("has a search query and NPI taxonomy for finding providers", () => {
    for (const route of Object.values(CARE_ROUTES)) {
      expect(route.placesQuery.length).toBeGreaterThan(0);
      expect(route.npiTaxonomy.length).toBeGreaterThan(0);
    }
  });

  it("warns that HMO plans may need a referral for a specialist", () => {
    expect(CARE_ROUTES.sports_medicine.accessNotes.join(" ")).toMatch(/HMO.*referral/);
  });
});

describe("KNEE_ADD_ONS", () => {
  it("prices the knee X-ray and MRI with known benchmark codes", () => {
    expect(KNEE_ADD_ONS.knee_xray.cpt).toBe("73562");
    expect(KNEE_ADD_ONS.knee_mri.cpt).toBe("73721");
    for (const addOn of Object.values(KNEE_ADD_ONS)) expect(isBenchmarkCpt(addOn.cpt)).toBe(true);
  });

  it("does not treat an unknown code as a benchmark", () => {
    expect(isBenchmarkCpt("99999")).toBe(false);
    expect(isBenchmarkCpt("constructor")).toBe(false);
  });
});
