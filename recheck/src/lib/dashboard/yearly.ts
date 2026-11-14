import { potentialSavings } from "@/lib/checks";
import type { FlagType } from "@/lib/checks/types";
import { sumCents } from "@/lib/money";
import type { VisitStatus } from "@/lib/visits/totals";

// The yearly picture, computed in code from visits the family uploaded.
// Every figure is a sum of amounts printed on their bills and EOBs.

export type YearVisit = {
  service_date: string;
  status: VisitStatus;
  billed_cents: number;
  patient_owes_cents: number;
  // "Your responsibility" on the visit's newest EOB, when there is one.
  eob_patient_responsibility_cents: number | null;
  flags: { type: FlagType; potential_savings_cents: number }[];
};

export type InsurancePlan = {
  deductible_cents: number | null;
  oop_max_cents: number | null;
  // What the person told us is already met; EOB amounts are used when higher.
  deductible_met_cents?: number | null;
  oop_met_cents?: number | null;
};

export type Progress = { usedCents: number; limitCents: number; percent: number };

export type YearSummary = {
  year: number;
  visitCount: number;
  billedCents: number;
  // The family's share: what the insurer says they owe where an EOB is in,
  // otherwise what the bill asks for.
  yourShareCents: number;
  owedNowCents: number;
  // Only amounts the insurer confirmed on EOBs count toward the plan's limits.
  confirmedByInsurerCents: number;
  savingsFoundCents: number;
  deductible: Progress | null;
  outOfPocket: Progress | null;
};

const progress = (used: number, limit: number): Progress => ({
  usedCents: Math.min(used, limit),
  limitCents: limit,
  percent: limit > 0 ? Math.min(100, Math.floor((used * 100) / limit)) : 100,
});

export function summarizeYear(year: number, allVisits: YearVisit[], plan: InsurancePlan | null): YearSummary {
  const visits = allVisits.filter((visit) => visit.service_date.startsWith(`${year}-`));
  const confirmed = sumCents(
    visits.map((visit) => visit.eob_patient_responsibility_cents ?? 0).map((cents) => Math.max(cents, 0)),
  );

  return {
    year,
    visitCount: visits.length,
    billedCents: sumCents(visits.map((visit) => visit.billed_cents)),
    yourShareCents: sumCents(
      visits.map((visit) => visit.eob_patient_responsibility_cents ?? visit.patient_owes_cents),
    ),
    owedNowCents: sumCents(
      visits
        .filter((visit) => visit.status === "to_pay" || visit.status === "disputing")
        .map((visit) => visit.patient_owes_cents),
    ),
    confirmedByInsurerCents: confirmed,
    savingsFoundCents: sumCents(
      visits.map((visit) => potentialSavings(visit.flags, visit.patient_owes_cents)),
    ),
    deductible:
      plan?.deductible_cents != null
        ? progress(Math.max(confirmed, plan.deductible_met_cents ?? 0), plan.deductible_cents)
        : null,
    outOfPocket:
      plan?.oop_max_cents != null
        ? progress(Math.max(confirmed, plan.oop_met_cents ?? 0), plan.oop_max_cents)
        : null,
  };
}
