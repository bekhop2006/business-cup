"use server";

import { redirect } from "next/navigation";
import { translateMessage } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
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

async function saveAboutYouDetails(
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

async function saveInsuranceDetails(
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

// Messages are written in English; show them in the reader's language.
async function translated(state: ProfileFormState): Promise<ProfileFormState> {
  return { ...state, error: translateMessage(await getLocale(), state.error) };
}

export async function saveAboutYouAction(previous: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  return translated(await saveAboutYouDetails(previous, formData));
}

export async function saveInsuranceAction(previous: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  return translated(await saveInsuranceDetails(previous, formData));
}

// Finishing or skipping onboarding: the rest can be added later on /profile.
export async function finishOnboardingAction() {
  const userId = await requireUserId();
  await markOnboarded(await createServerSupabase(), userId);
  redirect(HOME_PATH);
}
