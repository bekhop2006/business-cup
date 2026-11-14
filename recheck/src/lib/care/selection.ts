import { CARE_ROUTES, type ComparisonRouteId } from "@/lib/care/routes";
import { assessUrgency } from "@/lib/care/safety";
import { PFS_SOURCE, COMMERCIAL_MULTIPLIER } from "@/lib/costs/benchmarks";
import type { InsurancePlan } from "@/lib/costs/patientShare";
import { forecastScenarios } from "@/lib/costs/scenarios";
import type { CaseContext } from "@/lib/schemas/intake";

export function canCompareCare(context: CaseContext): boolean {
  return context.scope === "knee_leg" && context.answers !== undefined && assessUrgency(context.answers).urgency === "routine";
}

export function makeSelectionEstimate(route: ComparisonRouteId, plan: InsurancePlan, calculatedAt = new Date().toISOString()) {
  const scenarios = forecastScenarios(CARE_ROUTES[route], plan);
  const baseline = forecastScenarios(CARE_ROUTES.urgent_care, plan)[0].patientShare;
  // Compare care settings, never individual clinics: we have no clinic quotes.
  // Take the conservative difference; overlapping ranges mean no savings claim.
  const estimatedSavingsCents = Math.max(0, baseline.lowCents - scenarios[0].patientShare.highCents);
  return {
    version: 1 as const,
    calculated_at: calculatedAt,
    route,
    insurance_profile: { ...plan, copays: { ...plan.copays } },
    scenarios,
    sources: { medicare: PFS_SOURCE, commercial_multiplier: COMMERCIAL_MULTIPLIER },
    comparison: {
      baseline_route: "urgent_care" as const,
      baseline_patient_share: baseline,
      estimated_savings_cents: estimatedSavingsCents,
    },
  };
}
