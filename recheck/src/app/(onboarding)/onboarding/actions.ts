"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { markOnboarded, saveAboutYou, saveInsurancePlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import {
  aboutYouSchema,
  aboutYouToProfile,
  insuranceSchema,
  insuranceToProfile,
} from "@/lib/profile/onboarding";
import { HOME_PATH } from "@/lib/routes";

export type ProfileFormState = { error?: string };

// Where a form may send the person after saving.
const NEXT_PAGES = ["/onboarding?step=insurance", "/onboarding?step=done", "/profile?saved=1"] as const;
const nextPage = (formData: FormData) => {
  const next = String(formData.get("next"));
  return NEXT_PAGES.find((page) => page === next) ?? "/profile?saved=1";
};

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.id;
}

export async function saveAboutYouAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = await requireUserId();
  const parsed = aboutYouSchema.safeParse({
    fullName: formData.get("fullName"),
    zipCode: formData.get("zipCode"),
    householdSize: formData.get("householdSize") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await saveAboutYou(await createServerSupabase(), userId, aboutYouToProfile(parsed.data));
  } catch {
    return { error: "We couldn't save your details. Please try again." };
  }
  redirect(nextPage(formData));
}

export async function saveInsuranceAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = await requireUserId();
  const field = (name: string) => String(formData.get(name) ?? "");
  const parsed = insuranceSchema.safeParse({
    insurerName: field("insurerName"),
    planName: field("planName"),
    planType: field("planType"),
    deductible: field("deductible"),
    deductibleMet: field("deductibleMet"),
    oopMax: field("oopMax"),
    oopMet: field("oopMet"),
    coinsurance: field("coinsurance"),
    copayPrimary: field("copayPrimary"),
    copaySpecialist: field("copaySpecialist"),
    copayUrgentCare: field("copayUrgentCare"),
    copayEr: field("copayEr"),
  });
  if (!parsed.success) return { error: "Please check the details and try again." };

  const result = insuranceToProfile(parsed.data);
  if ("error" in result) return { error: result.error };

  try {
    await saveInsurancePlan(await createServerSupabase(), userId, {
      year: new Date().getUTCFullYear(),
      ...result.values,
    });
  } catch {
    return { error: "We couldn't save your insurance details. Please try again." };
  }
  redirect(nextPage(formData));
}

// Finishing or skipping onboarding: the rest can be added later on /profile.
export async function finishOnboardingAction() {
  const userId = await requireUserId();
  await markOnboarded(await createServerSupabase(), userId);
  redirect(HOME_PATH);
}
