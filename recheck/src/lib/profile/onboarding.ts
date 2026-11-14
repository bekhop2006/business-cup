import { z } from "zod";
import { formatCentsForInput, parseMoneyToCents } from "@/lib/money";

// Turns what a person typed during onboarding (or on their profile page) into
// the values we store. Every insurance field is optional: an empty field means
// "I don't know", never zero.

export const PLAN_TYPES = ["PPO", "HMO", "EPO", "POS", "HDHP", "other"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const COMMON_INSURERS = [
  "UnitedHealthcare",
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
];

export const aboutYouSchema = z.object({
  fullName: z.string().trim().min(1, "Tell us your name.").max(100, "That name is too long."),
  zipCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit US ZIP code."),
  householdSize: z.union([
    z.literal(""),
    z.coerce.number().int("Enter a whole number.").min(1, "Enter at least 1.").max(20, "Enter 20 or fewer."),
  ]),
});

export type AboutYou = { full_name: string; zip_code: string; household_size: number | null };

export function aboutYouToProfile(input: z.infer<typeof aboutYouSchema>): AboutYou {
  return {
    full_name: input.fullName,
    zip_code: input.zipCode,
    household_size: input.householdSize === "" ? null : input.householdSize,
  };
}

const text = z.string().trim().max(100);

export const insuranceSchema = z.object({
  insurerName: text,
  planName: text,
  planType: z.union([z.literal(""), z.enum(PLAN_TYPES)]),
  deductible: text,
  deductibleMet: text,
  oopMax: text,
  oopMet: text,
  coinsurance: text,
  copayPrimary: text,
  copaySpecialist: text,
  copayUrgentCare: text,
  copayEr: text,
});

export type InsuranceInput = z.infer<typeof insuranceSchema>;

export type InsuranceProfileValues = {
  insurer_name: string | null;
  plan_name: string | null;
  plan_type: PlanType | null;
  deductible_cents: number | null;
  deductible_met_cents: number | null;
  oop_max_cents: number | null;
  oop_met_cents: number | null;
  coinsurance_bps: number | null;
  copay_primary_cents: number | null;
  copay_specialist_cents: number | null;
  copay_urgent_care_cents: number | null;
  copay_er_cents: number | null;
};

// "20", "20%", "12.5 %" -> basis points (2000, 1250). Null when not a percent.
export function parsePercentToBps(value: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?\s*%?$/.exec(value.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bps <= 10000 ? bps : null;
}

export function insuranceToProfile(
  input: InsuranceInput,
): { values: InsuranceProfileValues } | { error: string } {
  const amounts: [keyof InsuranceInput, string][] = [
    ["deductible", "your deductible"],
    ["deductibleMet", "how much of your deductible is met"],
    ["oopMax", "your out-of-pocket maximum"],
    ["oopMet", "how much you've spent toward it"],
    ["copayPrimary", "the primary care copay"],
    ["copaySpecialist", "the specialist copay"],
    ["copayUrgentCare", "the urgent care copay"],
    ["copayEr", "the emergency room copay"],
  ];
  const cents: Partial<Record<keyof InsuranceInput, number | null>> = {};
  for (const [field, label] of amounts) {
    const raw = input[field];
    if (!raw) {
      cents[field] = null;
      continue;
    }
    const parsed = parseMoneyToCents(raw);
    if (parsed === null || parsed < 0) return { error: `Check ${label}: enter an amount like 1,500.` };
    cents[field] = parsed;
  }

  let coinsuranceBps: number | null = null;
  if (input.coinsurance) {
    coinsuranceBps = parsePercentToBps(input.coinsurance);
    if (coinsuranceBps === null) return { error: "Check your coinsurance: enter a percent like 20." };
  }

  const exceeds = (met: number | null | undefined, total: number | null | undefined) =>
    met != null && total != null && met > total;
  if (exceeds(cents.deductibleMet, cents.deductible)) {
    return { error: "The amount met can't be more than your deductible." };
  }
  if (exceeds(cents.oopMet, cents.oopMax)) {
    return { error: "The amount spent can't be more than your out-of-pocket maximum." };
  }

  return {
    values: {
      insurer_name: input.insurerName || null,
      plan_name: input.planName || null,
      plan_type: input.planType || null,
      deductible_cents: cents.deductible ?? null,
      deductible_met_cents: cents.deductibleMet ?? null,
      oop_max_cents: cents.oopMax ?? null,
      oop_met_cents: cents.oopMet ?? null,
      coinsurance_bps: coinsuranceBps,
      copay_primary_cents: cents.copayPrimary ?? null,
      copay_specialist_cents: cents.copaySpecialist ?? null,
      copay_urgent_care_cents: cents.copayUrgentCare ?? null,
      copay_er_cents: cents.copayEr ?? null,
    },
  };
}

// The details that change a cost estimate. The more are known, the narrower
// the estimate's range.
const ESTIMATE_DETAILS: (keyof InsuranceProfileValues)[] = [
  "deductible_cents",
  "deductible_met_cents",
  "oop_max_cents",
  "oop_met_cents",
  "coinsurance_bps",
  "copay_primary_cents",
  "copay_specialist_cents",
  "copay_urgent_care_cents",
  "copay_er_cents",
];

// A profile as stored: the database keeps the plan type as plain text.
export type StoredInsurance = Omit<Partial<InsuranceProfileValues>, "plan_type"> & {
  plan_type?: string | null;
};

export function estimateDetailsKnown(profile: StoredInsurance | null): {
  known: number;
  total: number;
} {
  const known = ESTIMATE_DETAILS.filter((field) => profile?.[field] != null).length;
  return { known, total: ESTIMATE_DETAILS.length };
}

const bpsToPercent = (bps: number) =>
  bps % 100 === 0 ? String(bps / 100) : `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0").replace(/0$/, "")}`;

// The saved profile as form values, so the same form can edit it.
export function insuranceToInput(profile: StoredInsurance | null): InsuranceInput {
  const money = (cents: number | null | undefined) => (cents == null ? "" : formatCentsForInput(cents));
  return {
    insurerName: profile?.insurer_name ?? "",
    planName: profile?.plan_name ?? "",
    planType: PLAN_TYPES.find((type) => type === profile?.plan_type) ?? "",
    deductible: money(profile?.deductible_cents),
    deductibleMet: money(profile?.deductible_met_cents),
    oopMax: money(profile?.oop_max_cents),
    oopMet: money(profile?.oop_met_cents),
    coinsurance: profile?.coinsurance_bps == null ? "" : bpsToPercent(profile.coinsurance_bps),
    copayPrimary: money(profile?.copay_primary_cents),
    copaySpecialist: money(profile?.copay_specialist_cents),
    copayUrgentCare: money(profile?.copay_urgent_care_cents),
    copayEr: money(profile?.copay_er_cents),
  };
}
