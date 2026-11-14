import type { CareSetting } from "@/lib/care/routes";
import { applyBps } from "@/lib/costs/bps";

// Public price benchmarks: what Medicare pays nationally for a code under the
// 2026 Physician Fee Schedule (PFS). These are real published numbers, not
// what a commercial plan pays; see COMMERCIAL_MULTIPLIER for that step.
//
// How the amounts were taken: CMS publishes total relative value units (RVUs)
// per code and a conversion factor. The national payment amount is
// total RVUs × conversion factor, rounded to the cent (all geographic
// adjusters are 1.0 nationally). The RVUs are stored next to each amount and
// tests recompute every amount from them.

export const PFS_SOURCE = {
  name: "CMS Medicare Physician Fee Schedule, national payment amounts",
  year: 2026,
  release: "RVU26D, October 2026 release (released 08/26/2026), file PPRRVU2026_Oct_nonQPP",
  url: "https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files/rvu26d",
  // $33.4009, the 2026 conversion factor for clinicians who are not
  // qualifying APM participants, which is most clinicians. Qualifying APM
  // participants get $33.5675 (file PPRRVU2026_Oct_QPP).
  conversionFactorTenThousandths: 334_009,
} as const;

export type BenchmarkCpt = "99203" | "99284" | "73562" | "73721";

export type PfsAmount = {
  // Total RVUs for this setting, in hundredths (3.52 RVUs = 352).
  totalRvuHundredths: number;
  // "26" is the professional component: the doctor's reading of an image,
  // billed alone when a hospital bills the technical part itself.
  modifier: "26" | null;
  cents: number;
};

export type MedicareBenchmark = {
  cpt: BenchmarkCpt;
  label: string;
  // Clinic or office (PFS non-facility amount). null when Medicare does not
  // pay this code outside a hospital.
  office: PfsAmount | null;
  // The doctor's part when a hospital also bills its own fee.
  facility: PfsAmount;
};

export const MEDICARE_BENCHMARKS: Record<BenchmarkCpt, MedicareBenchmark> = {
  "99203": {
    cpt: "99203",
    label: "Office visit, new patient (low complexity)",
    office: { totalRvuHundredths: 352, modifier: null, cents: 11_757 },
    facility: { totalRvuHundredths: 214, modifier: null, cents: 7_148 },
  },
  "99284": {
    cpt: "99284",
    label: "Emergency department visit (moderate complexity)",
    // The file marks the non-facility amount "NA": only paid in a hospital.
    office: null,
    facility: { totalRvuHundredths: 354, modifier: null, cents: 11_824 },
  },
  "73562": {
    cpt: "73562",
    label: "Knee X-ray (3 views)",
    // Global amount: taking the X-ray plus the doctor's reading.
    office: { totalRvuHundredths: 127, modifier: null, cents: 4_242 },
    facility: { totalRvuHundredths: 28, modifier: "26", cents: 935 },
  },
  "73721": {
    cpt: "73721",
    label: "Knee MRI without contrast",
    office: { totalRvuHundredths: 612, modifier: null, cents: 20_441 },
    facility: { totalRvuHundredths: 188, modifier: "26", cents: 6_279 },
  },
};

// Neither code above is listed in the 2026 OPPS imaging cap file
// (OPPSCAP_Oct in the same RVU26D release), so no cap lowers these amounts.

// Not included: the hospital's own facility fee (Medicare OPPS) for an ER
// visit or hospital imaging. CMS serves the OPPS Addendum B file only after
// accepting the AMA CPT license, which was not done, so no OPPS amount here
// is verified and none is used.
export const HOSPITAL_FEE_NOT_INCLUDED =
  "The hospital's own facility fee, billed separately. We couldn't verify a public rate for it, so it isn't in these numbers.";

export function isBenchmarkCpt(cpt: string): cpt is BenchmarkCpt {
  return Object.hasOwn(MEDICARE_BENCHMARKS, cpt);
}

// Medicare's national 2026 amount for the doctor's part in this setting.
export function medicareCents(cpt: BenchmarkCpt, setting: CareSetting): number {
  const benchmark = MEDICARE_BENCHMARKS[cpt];
  const amount = setting === "office" ? benchmark.office : benchmark.facility;
  if (!amount) throw new Error(`No Medicare ${setting} amount for CPT ${cpt}`);
  return amount.cents;
}

// ASSUMPTION, not a CMS number: commercial plans usually pay more than
// Medicare for the same service. We turn the Medicare amount into a range
// using the spread KFF found across published studies.
export const COMMERCIAL_MULTIPLIER = {
  isAssumption: true,
  lowBps: 11_800,
  averageBps: 14_300,
  highBps: 17_900,
  appliesTo: "physician services",
  source: {
    name: "KFF, How Much More Than Medicare Do Private Insurers Pay? A Review of the Literature (Lopez, Neuman, Jacobson, Levitt)",
    year: 2020,
    url: "https://www.kff.org/medicare/issue-brief/how-much-more-than-medicare-do-private-insurers-pay-a-review-of-the-literature/",
  },
  description:
    "Across the studies KFF reviewed, private insurers paid 118% to 179% of Medicare rates for physician services (143% on average). Your plan's rate with a given provider can be outside this range.",
} as const;

export type PriceRange = { lowCents: number; highCents: number };

// What a commercial plan might allow for a service Medicare pays `cents` for.
export function commercialPriceRange(cents: number): PriceRange {
  return {
    lowCents: applyBps(cents, COMMERCIAL_MULTIPLIER.lowBps),
    highCents: applyBps(cents, COMMERCIAL_MULTIPLIER.highBps),
  };
}
