import { describe, expect, it } from "vitest";
import {
  addMonths,
  eligibleServices,
  intervalMonths,
  parseDoneMonth,
  preventiveChecklist,
  serviceStatus,
} from "@/lib/preventive/schedule";
import { PREVENTIVE_SERVICES } from "@/lib/preventive/services";

const today = new Date("2026-11-15T12:00:00Z");
const service = (id: string) => PREVENTIVE_SERVICES.find((item) => item.id === id)!;
const ids = (profile: Parameters<typeof eligibleServices>[0]) => eligibleServices(profile, today).services.map((item) => item.id);

describe("eligibleServices", () => {
  it("shows only the services for all adults when age and sex are missing", () => {
    const result = eligibleServices({ birthYear: null, sex: null, tbRisk: null }, today);
    expect(result.services.map((item) => item.id)).toEqual(["flu_vaccine", "tdap_vaccine"]);
    expect(result.hiddenForMissingAge).toBeGreaterThan(0);
  });

  it("starts colorectal screening the year the person turns 45", () => {
    expect(ids({ birthYear: 1982, sex: "male", tbRisk: false })).not.toContain("colorectal_cancer"); // 44
    expect(ids({ birthYear: 1981, sex: "male", tbRisk: false })).toContain("colorectal_cancer"); // 45
  });

  it("matches sex-specific screenings to the person's sex", () => {
    const woman = ids({ birthYear: 1980, sex: "female", tbRisk: false });
    const man = ids({ birthYear: 1980, sex: "male", tbRisk: false });
    expect(woman).toEqual(expect.arrayContaining(["breast_cancer", "cervical_cancer"]));
    expect(man).not.toContain("breast_cancer");
    expect(man).not.toContain("cervical_cancer");
  });

  it("hides sex-specific screenings until sex is given", () => {
    const result = eligibleServices({ birthYear: 1980, sex: null, tbRisk: false }, today);
    expect(result.services.map((item) => item.id)).not.toContain("breast_cancer");
    expect(result.hiddenForMissingSex).toBe(2);
  });

  it("adds latent TB screening only for people at increased risk", () => {
    expect(ids({ birthYear: 1990, sex: "male", tbRisk: true })).toContain("latent_tb");
    expect(ids({ birthYear: 1990, sex: "male", tbRisk: false })).not.toContain("latent_tb");
    expect(ids({ birthYear: 1990, sex: "male", tbRisk: null })).not.toContain("latent_tb");
  });

  it("respects upper age limits", () => {
    expect(ids({ birthYear: 1946, sex: "male", tbRisk: false })).not.toContain("colorectal_cancer"); // 80
    expect(ids({ birthYear: 1946, sex: "male", tbRisk: false })).toContain("rsv_vaccine");
  });
});

describe("serviceStatus", () => {
  it("is not recorded without a date", () => {
    expect(serviceStatus(service("flu_vaccine"), null, 46, today)).toEqual({ kind: "not_recorded" });
  });

  it("puts the next flu shot a year after the last one", () => {
    expect(serviceStatus(service("flu_vaccine"), { lastDoneOn: "2026-10-01", method: null }, 46, today)).toEqual({
      kind: "up_to_date",
      lastDoneOn: "2026-10-01",
      nextDueOn: "2027-10-01",
    });
  });

  it("marks a flu shot from last season as due", () => {
    expect(serviceStatus(service("flu_vaccine"), { lastDoneOn: "2025-10-01", method: null }, 46, today).kind).toBe("due");
  });

  it("uses the test the person had for colorectal screening", () => {
    const colorectal = service("colorectal_cancer");
    expect(serviceStatus(colorectal, { lastDoneOn: "2022-05-01", method: "colonoscopy" }, 46, today)).toMatchObject({
      kind: "up_to_date",
      nextDueOn: "2032-05-01",
    });
    expect(serviceStatus(colorectal, { lastDoneOn: "2022-05-01", method: "stool_test" }, 46, today).kind).toBe("due");
  });

  it("keeps one-time services done", () => {
    expect(serviceStatus(service("hepatitis_c"), { lastDoneOn: "2019-01-01", method: null }, 46, today)).toEqual({
      kind: "up_to_date",
      lastDoneOn: "2019-01-01",
      nextDueOn: null,
    });
  });
});

describe("intervalMonths", () => {
  it("checks blood pressure yearly from 40 and every 3 years before", () => {
    expect(intervalMonths(service("blood_pressure"), 39, null)).toBe(36);
    expect(intervalMonths(service("blood_pressure"), 40, null)).toBe(12);
  });
});

describe("preventiveChecklist", () => {
  it("counts services the person hasn't used or is due for", () => {
    const list = preventiveChecklist(
      { birthYear: 1980, sex: "male", tbRisk: false },
      [{ service_id: "flu_vaccine", last_done_on: "2026-10-01", method: null }],
      today,
    );
    expect(list.items.find((item) => item.service.id === "flu_vaccine")?.status.kind).toBe("up_to_date");
    expect(list.unused).toBe(list.items.length - 1);
  });
});

describe("dates", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
  });

  it("parses a done month and rejects future or malformed ones", () => {
    expect(parseDoneMonth("2026-10", today)).toBe("2026-10-01");
    expect(parseDoneMonth("", today)).toBeNull();
    expect(parseDoneMonth("2027-01", today)).toBe("invalid");
    expect(parseDoneMonth("10/2026", today)).toBe("invalid");
  });
});
