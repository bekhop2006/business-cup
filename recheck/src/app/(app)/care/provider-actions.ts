"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseAppointmentTime } from "@/lib/care/appointment";
import { CARE_ROUTES } from "@/lib/care/routes";
import { insuranceToCostPlan } from "@/lib/care/profile";
import { canCompareCare, makeSelectionEstimate } from "@/lib/care/selection";
import { canCompareCareOptions } from "@/lib/billing/plan";
import { getCurrentUser } from "@/lib/db/auth";
import { getCareCase, getCaseProvider, getFirstCareCaseId, saveCaseAppointment, saveCaseChoice, saveCaseProviders, saveCaseProviderSearch, setCaseAppointmentStatus } from "@/lib/db/care";
import { getInsurancePlan, getPlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { env } from "@/lib/env";
import { findProviders, zipSchema } from "@/lib/providers";
import { readCaseContext } from "@/lib/schemas/intake";
import { chosenProviderSchema, comparisonRouteSchema } from "@/lib/schemas/providers";

export type ProviderFormState = { error?: string };
const caseRouteSchema = z.object({ caseId: z.uuid(), route: comparisonRouteSchema });
const safetyError = "Review your safety answers before comparing providers. If you need urgent care, don't wait for this page.";
const paywallError = "Comparing providers for this care question is part of Recheck Plus.";

type Db = Awaited<ReturnType<typeof createServerSupabase>>;

async function mayCompare(db: Db, userId: string, caseId: string): Promise<boolean> {
  return canCompareCareOptions(await getPlan(db, userId), caseId, await getFirstCareCaseId(db, userId));
}

export async function searchCaseProviders(_previous: ProviderFormState, form: FormData): Promise<ProviderFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = caseRouteSchema.extend({ zip: zipSchema }).safeParse({
    caseId: form.get("caseId"), route: form.get("route"), zip: String(form.get("zip") ?? "").trim(),
  });
  if (!parsed.success) return { error: "Choose a care option and enter a 5-digit US ZIP code." };
  const { caseId, route, zip } = parsed.data;
  try {
    const db = await createServerSupabase();
    const careCase = await getCareCase(db, user.id, caseId);
    if (!careCase) return { error: "This care question wasn't found." };
    if (!canCompareCare(readCaseContext(careCase.warning_answers))) return { error: safetyError };
    if (!await mayCompare(db, user.id, caseId)) return { error: paywallError };
    const option = CARE_ROUTES[route];
    const result = await findProviders({
      zip, placesQuery: option.placesQuery, npiTaxonomy: option.npiTaxonomy,
      placesApiKey: env.GOOGLE_PLACES_API_KEY, limit: 10,
    });
    // The person may have changed their answers while the directory was loading.
    const latestCase = await getCareCase(db, user.id, caseId);
    const context = readCaseContext(latestCase?.warning_answers);
    if (!latestCase || !canCompareCare(context)) return { error: safetyError };
    const providerIds = await saveCaseProviders(db, user.id, caseId, route, result.providers);
    await saveCaseProviderSearch(db, user.id, caseId, context, route, {
      zip, source: result.source, searched_at: new Date().toISOString(),
      status: result.error ? "unavailable" : providerIds.length ? "found" : "empty",
      provider_ids: providerIds,
    });
  } catch {
    return { error: "We couldn't complete or save the provider search. Please try again." };
  }
  revalidatePath(`/care/${caseId}`);
  redirect(`/care/${caseId}?route=${route}#providers`);
}

export async function chooseCaseProvider(_previous: ProviderFormState, form: FormData): Promise<ProviderFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = caseRouteSchema.extend({ providerId: z.uuid() }).safeParse({
    caseId: form.get("caseId"), route: form.get("route"), providerId: form.get("providerId"),
  });
  if (!parsed.success) return { error: "Choose a provider from the latest search results." };
  const { caseId, route, providerId } = parsed.data;
  try {
    const db = await createServerSupabase();
    const careCase = await getCareCase(db, user.id, caseId);
    if (!careCase) return { error: "This care question wasn't found." };
    const context = readCaseContext(careCase.warning_answers);
    if (!canCompareCare(context)) return { error: safetyError };
    if (!await mayCompare(db, user.id, caseId)) return { error: paywallError };
    if (!context.revision || !context.provider_searches?.[route]?.provider_ids.includes(providerId)) {
      return { error: "This provider isn't in the latest results for this care option. Search again." };
    }
    // Read the snapshot from our database; never accept provider data or prices from the form.
    const row = await getCaseProvider(db, user.id, caseId, route, providerId);
    const provider = chosenProviderSchema.safeParse(row);
    if (!provider.success) return { error: "This provider wasn't found. Please search again." };
    const profile = await getInsurancePlan(db, user.id, new Date().getUTCFullYear());
    const estimate = makeSelectionEstimate(route, insuranceToCostPlan(profile));
    await saveCaseChoice(db, user.id, caseId, provider.data, estimate, context.revision);
  } catch {
    return { error: "We couldn't save your choice. Review your safety answers and try again." };
  }
  revalidatePath(`/care/${caseId}`);
  revalidatePath("/home");
  redirect(`/care/${caseId}?route=${route}#your-choice`);
}

// The person booked by phone or email and tells us when. Recheck never books.
export async function bookAppointment(_previous: ProviderFormState, form: FormData): Promise<ProviderFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const caseId = z.uuid().safeParse(form.get("caseId"));
  if (!caseId.success) return { error: "This care question wasn't found." };
  const appointmentAt = parseAppointmentTime(String(form.get("appointmentAt") ?? ""), new Date());
  if (appointmentAt === "invalid") return { error: "Enter the date and time of your appointment." };
  if (appointmentAt === "past") return { error: "That time has passed. Enter the date and time you booked." };
  try {
    await saveCaseAppointment(await createServerSupabase(), user.id, caseId.data, appointmentAt);
  } catch {
    return { error: "We couldn't save your appointment. Choose a provider first, then try again." };
  }
  revalidatePath(`/care/${caseId.data}`);
  revalidatePath("/home");
  return {};
}

const statusSchema = z.object({ caseId: z.uuid(), status: z.enum(["done", "cancelled"]), next: z.enum(["home", "case"]) });

export async function updateAppointmentStatus(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = statusSchema.safeParse({ caseId: form.get("caseId"), status: form.get("status"), next: form.get("next") });
  if (!parsed.success) redirect("/home");
  const { caseId, status, next } = parsed.data;
  await setCaseAppointmentStatus(await createServerSupabase(), user.id, caseId, status);
  revalidatePath(`/care/${caseId}`);
  revalidatePath("/home");
  if (status === "done") redirect("/upload");
  redirect(next === "home" ? "/home" : `/care/${caseId}#your-choice`);
}
