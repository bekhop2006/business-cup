import { describe, expect, it } from "vitest";
import {
  canSeeDashboard,
  canSeeVisitChecks,
  canWriteLetters,
  planForSubscriptionStatus,
} from "@/lib/billing/plan";
import { summarizeYear, type YearVisit } from "@/lib/dashboard/yearly";

describe("plan access", () => {
  it("gives a free user the check of their first visit only", () => {
    expect(canSeeVisitChecks("free", "first", "first")).toBe(true);
    expect(canSeeVisitChecks("free", "second", "first")).toBe(false);
    expect(canSeeVisitChecks("paid", "second", "first")).toBe(true);
  });

  it("keeps letters and the dashboard on the paid plan", () => {
    expect(canWriteLetters("free")).toBe(false);
    expect(canSeeDashboard("free")).toBe(false);
    expect(canWriteLetters("paid")).toBe(true);
    expect(canSeeDashboard("paid")).toBe(true);
  });

  it("maps Stripe subscription statuses to a plan", () => {
    expect(planForSubscriptionStatus("active")).toBe("paid");
    expect(planForSubscriptionStatus("trialing")).toBe("paid");
    for (const status of ["canceled", "unpaid", "past_due", "incomplete", "incomplete_expired", "paused"]) {
      expect(planForSubscriptionStatus(status)).toBe("free");
    }
  });
});

describe("summarizeYear", () => {
  const lakeview: YearVisit = {
    service_date: "2026-05-03",
    status: "to_pay",
    billed_cents: 252200,
    patient_owes_cents: 39340,
    eob_patient_responsibility_cents: 29740,
    flags: [
      { type: "duplicate_line", potential_savings_cents: 9600 },
      { type: "eob_mismatch", potential_savings_cents: 9600 },
    ],
  };
  const maple: YearVisit = {
    service_date: "2026-03-12",
    status: "to_pay",
    billed_cents: 23000,
    patient_owes_cents: 4000,
    eob_patient_responsibility_cents: 4000,
    flags: [],
  };
  const quickcare: YearVisit = {
    service_date: "2026-07-18",
    status: "waiting_for_insurance",
    billed_cents: 82500,
    patient_owes_cents: 82500,
    eob_patient_responsibility_cents: null,
    flags: [{ type: "total_mismatch", potential_savings_cents: 6000 }],
  };
  const lastYear: YearVisit = { ...maple, service_date: "2025-12-30" };

  it("adds up one year of visits from the documents' own amounts", () => {
    const summary = summarizeYear(2026, [lakeview, maple, quickcare, lastYear], {
      deductible_cents: 150000,
      oop_max_cents: 600000,
    });
    expect(summary).toEqual({
      year: 2026,
      visitCount: 3,
      billedCents: 357700,
      yourShareCents: 29740 + 4000 + 82500,
      owedNowCents: 39340 + 4000,
      confirmedByInsurerCents: 33740,
      savingsFoundCents: 9600 + 6000,
      deductible: { usedCents: 33740, limitCents: 150000, percent: 22 },
      outOfPocket: { usedCents: 33740, limitCents: 600000, percent: 5 },
    });
  });

  it("caps progress at the plan's limit", () => {
    const summary = summarizeYear(2026, [lakeview], { deductible_cents: 10000, oop_max_cents: 0 });
    expect(summary.deductible).toEqual({ usedCents: 10000, limitCents: 10000, percent: 100 });
    expect(summary.outOfPocket).toEqual({ usedCents: 0, limitCents: 0, percent: 100 });
  });

  it("shows no progress without an insurance plan, and zeros for an empty year", () => {
    const summary = summarizeYear(2024, [lakeview], null);
    expect(summary).toMatchObject({ visitCount: 0, billedCents: 0, deductible: null, outOfPocket: null });
  });
});
