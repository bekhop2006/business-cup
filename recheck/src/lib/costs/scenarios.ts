import { KNEE_ADD_ONS, type AddOn, type CareRoute } from "@/lib/care/routes";
import {
  COMMERCIAL_MULTIPLIER,
  HOSPITAL_FEE_NOT_INCLUDED,
  isBenchmarkCpt,
  medicareCents,
  PFS_SOURCE,
  commercialPriceRange,
  type PriceRange,
} from "@/lib/costs/benchmarks";
import {
  estimatePatientShare,
  type Confidence,
  type InsurancePlan,
  type PatientShareEstimate,
} from "@/lib/costs/patientShare";

// Three possible ways a visit can go, priced from public benchmarks and the
// user's own plan. We show all three so the user sees the spread; none of
// them is a recommendation.

export type ScenarioId = "visit" | "visit_xray" | "visit_mri";

export type ScenarioItem = {
  cpt: string;
  label: string;
  // Medicare's 2026 national amount for this setting.
  medicareCents: number;
  // Medicare amount × the commercial multiplier range (an assumption).
  benchmark: PriceRange;
};

export type Scenario = {
  id: ScenarioId;
  label: string;
  items: ScenarioItem[];
  medicareCents: number;
  benchmark: PriceRange;
  patientShare: PriceRange;
  confidence: Confidence;
  assumptions: string[];
  unknowns: string[];
  notIncluded: string[];
  note: string;
};

export const NOT_A_RECOMMENDATION = "This does not mean you need an X-ray or MRI.";

export const PRICE_ASSUMPTION = `Prices start from Medicare's ${PFS_SOURCE.year} national rate and are multiplied by ${COMMERCIAL_MULTIPLIER.lowBps / 100}% to ${COMMERCIAL_MULTIPLIER.highBps / 100}%, the range private insurers paid in studies reviewed by KFF (${COMMERCIAL_MULTIPLIER.source.year}). Your plan's rate, and prices in your area, may differ.`;

function priceItem(cpt: string, label: string, route: CareRoute): ScenarioItem {
  if (!isBenchmarkCpt(cpt)) throw new Error(`No benchmark for CPT ${cpt}`);
  const medicare = medicareCents(cpt, route.setting);
  return { cpt, label, medicareCents: medicare, benchmark: commercialPriceRange(medicare) };
}

function sumRanges(ranges: PriceRange[]): PriceRange {
  return {
    lowCents: ranges.reduce((total, r) => total + r.lowCents, 0),
    highCents: ranges.reduce((total, r) => total + r.highCents, 0),
  };
}

function notIncludedFor(route: CareRoute, addOn: AddOn | null): string[] {
  const items = ["Other tests, treatment, braces, medicines or follow-up visits."];
  if (route.setting === "facility") {
    items.push(HOSPITAL_FEE_NOT_INCLUDED);
    if (addOn) items.push(`The hospital's charge for doing the ${addOn.shortName}. Only the doctor's reading of it is included.`);
  } else {
    items.push("A facility fee, if the clinic is owned by a hospital.");
    if (addOn) items.push(`Hospital prices, if the ${addOn.shortName} is done at a hospital instead of an office or imaging center.`);
  }
  return items;
}

function scenarioAssumptions(route: CareRoute, share: PatientShareEstimate): string[] {
  const assumptions = [PRICE_ASSUMPTION, ...share.assumptions];
  if (route.copayKind === "er" && share.method === "copay") {
    assumptions.push(
      "An ER copay often covers the whole ER visit, including the hospital's fee that isn't priced here. You may pay up to your full ER copay.",
    );
  }
  return assumptions;
}

function forecast(
  id: ScenarioId,
  label: string,
  route: CareRoute,
  plan: InsurancePlan,
  addOn: AddOn | null,
): Scenario {
  const visit = priceItem(route.visit.cpt, route.visit.label, route);
  const extra = addOn ? priceItem(addOn.cpt, addOn.label, route) : null;
  const items = extra ? [visit, extra] : [visit];

  // Share is lowest at the low price and highest at the high price.
  const low = estimatePatientShare({
    allowedCents: visit.benchmark.lowCents,
    extrasAllowedCents: extra?.benchmark.lowCents ?? 0,
    plan,
    copayKind: route.copayKind,
  });
  const high = estimatePatientShare({
    allowedCents: visit.benchmark.highCents,
    extrasAllowedCents: extra?.benchmark.highCents ?? 0,
    plan,
    copayKind: route.copayKind,
  });

  return {
    id,
    label,
    items,
    medicareCents: items.reduce((total, item) => total + item.medicareCents, 0),
    benchmark: sumRanges(items.map((item) => item.benchmark)),
    patientShare: { lowCents: low.lowCents, highCents: high.highCents },
    confidence: high.confidence,
    assumptions: scenarioAssumptions(route, high),
    unknowns: high.unknowns,
    notIncluded: notIncludedFor(route, addOn),
    note: NOT_A_RECOMMENDATION,
  };
}

export function forecastScenarios(route: CareRoute, plan: InsurancePlan): Scenario[] {
  return [
    forecast("visit", "Visit only", route, plan, null),
    forecast("visit_xray", "Visit + knee X-ray", route, plan, KNEE_ADD_ONS.knee_xray),
    forecast("visit_mri", "Visit + knee MRI", route, plan, KNEE_ADD_ONS.knee_mri),
  ];
}
