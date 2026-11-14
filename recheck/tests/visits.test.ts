import { describe, expect, it } from "vitest";
import { findMatchingVisit, sameProvider, samePerson } from "@/lib/visits/match";
import { computeVisitTotals, type TotalsDocument } from "@/lib/visits/totals";

describe("sameProvider", () => {
  it("matches the same provider written differently", () => {
    expect(sameProvider("Lakeview General Hospital", "LAKEVIEW GENERAL HOSPITAL, INC.")).toBe(true);
    expect(sameProvider("Maple Grove Pediatrics", "Maple Grove Pediatrics PC")).toBe(true);
    expect(sameProvider("Lakeview General", "Lakeview General Hospital")).toBe(true);
  });

  it("keeps different providers apart", () => {
    expect(sameProvider("Lakeview General Hospital", "Lakeside Medical Center")).toBe(false);
    expect(sameProvider("QuickCare Urgent Care", "Maple Grove Pediatrics")).toBe(false);
    expect(sameProvider("Inc.", "LLC")).toBe(false);
  });
});

describe("samePerson", () => {
  it("ignores letter case and extra spaces", () => {
    expect(samePerson("Mia  Ellis", "MIA ELLIS")).toBe(true);
    expect(samePerson("Mia Ellis", "Sam Ellis")).toBe(false);
  });
});

describe("findMatchingVisit", () => {
  const visits = [
    { id: "lakeview", provider_name: "Lakeview General Hospital", service_date: "2026-05-03", family_member_id: "sam" },
    { id: "maple", provider_name: "Maple Grove Pediatrics", service_date: "2026-03-12", family_member_id: null },
  ];

  it("finds the visit with the same provider, date and person", () => {
    const match = findMatchingVisit(visits, {
      provider_name: "Lakeview General Hospital",
      service_date: "2026-05-03",
      family_member_id: "sam",
    });
    expect(match?.id).toBe("lakeview");
  });

  it("treats an unknown person on either side as a match", () => {
    expect(
      findMatchingVisit(visits, { provider_name: "Lakeview General Hospital", service_date: "2026-05-03", family_member_id: null })?.id,
    ).toBe("lakeview");
    expect(
      findMatchingVisit(visits, { provider_name: "Maple Grove Pediatrics", service_date: "2026-03-12", family_member_id: "mia" })?.id,
    ).toBe("maple");
  });

  it("does not match another date, provider or person", () => {
    expect(findMatchingVisit(visits, { provider_name: "Lakeview General Hospital", service_date: "2026-05-04", family_member_id: "sam" })).toBeNull();
    expect(findMatchingVisit(visits, { provider_name: "QuickCare Urgent Care", service_date: "2026-05-03", family_member_id: "sam" })).toBeNull();
    expect(findMatchingVisit(visits, { provider_name: "Lakeview General Hospital", service_date: "2026-05-03", family_member_id: "mia" })).toBeNull();
  });
});

describe("computeVisitTotals", () => {
  const bill: TotalsDocument = {
    type: "bill",
    created_at: "2026-06-12T10:00:00Z",
    stated_total_cents: 252200,
    line_amounts_cents: [145000, 38000, 9600, 9600, 14200, 31000, 4800],
    insurance_paid_cents: 118960,
    patient_responsibility_cents: 39340,
  };
  const eob: TotalsDocument = {
    type: "eob",
    created_at: "2026-06-01T10:00:00Z",
    stated_total_cents: 242600,
    line_amounts_cents: [145000, 38000, 9600, 14200, 31000, 4800],
    insurance_paid_cents: 118960,
    patient_responsibility_cents: 29740,
  };

  it("takes billed and owed from the bill and insurance paid from the EOB", () => {
    expect(computeVisitTotals([bill, eob], "waiting_for_insurance")).toEqual({
      billed_cents: 252200,
      insurance_paid_cents: 118960,
      patient_owes_cents: 39340,
      status: "to_pay",
    });
  });

  it("uses the EOB alone when there is no bill yet", () => {
    expect(computeVisitTotals([eob], "waiting_for_insurance")).toMatchObject({
      billed_cents: 242600,
      patient_owes_cents: 29740,
      status: "to_pay",
    });
  });

  it("waits for insurance when a bill shows no insurance payment and there is no EOB", () => {
    const pending = { ...bill, insurance_paid_cents: 0, patient_responsibility_cents: 82500 };
    expect(computeVisitTotals([pending], "to_pay").status).toBe("waiting_for_insurance");
  });

  it("adds up the lines when a bill prints no total", () => {
    expect(computeVisitTotals([{ ...bill, stated_total_cents: null }], "to_pay").billed_cents).toBe(252200);
  });

  it("uses the newest bill when there are several", () => {
    const newer = { ...bill, created_at: "2026-07-01T00:00:00Z", patient_responsibility_cents: 29740 };
    expect(computeVisitTotals([bill, newer, eob], "to_pay").patient_owes_cents).toBe(29740);
  });

  it("closes a visit with nothing left to pay and keeps an open dispute", () => {
    const paid = { ...bill, patient_responsibility_cents: 0 };
    expect(computeVisitTotals([paid, eob], "to_pay").status).toBe("closed");
    expect(computeVisitTotals([bill, eob], "disputing").status).toBe("disputing");
  });
});
