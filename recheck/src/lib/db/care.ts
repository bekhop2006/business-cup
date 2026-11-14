import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { CaseContext } from "@/lib/schemas/intake";
import type { Urgency } from "@/lib/care/safety";
import type { ComparisonRouteId } from "@/lib/care/routes";
import type { ProviderResult } from "@/lib/providers";
import type { ChosenProvider, ProviderSearch } from "@/lib/schemas/providers";
import { canCompareCare, type makeSelectionEstimate } from "@/lib/care/selection";
import { readCaseContext } from "@/lib/schemas/intake";

type Db = SupabaseClient<Database>;
export type CareCase = Database["public"]["Tables"]["care_cases"]["Row"];
export type CaseProvider = Database["public"]["Tables"]["case_providers"]["Row"];

export async function createCareCase(db: Db, userId: string, description: string, context: CaseContext) {
  const { data, error } = await db.from("care_cases").insert({
    user_id: userId,
    description,
    summary: context.intake?.summary ?? null,
    body_area: context.intake?.body_area ?? null,
    warning_answers: { ...context, revision: randomUUID() },
  }).select("id").single();
  if (error) throw new Error("Could not save the care question.");
  return data.id;
}

export async function getCareCase(db: Db, userId: string, caseId: string) {
  const { data, error } = await db.from("care_cases").select("*").eq("user_id", userId).eq("id", caseId).maybeSingle();
  if (error) throw new Error("Could not load the care question.");
  return data;
}

export async function listCareCases(db: Db, userId: string) {
  const { data, error } = await db.from("care_cases").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error("Could not load care questions.");
  return data;
}

// The user's first care question: it is free in full on the free plan.
export async function getFirstCareCaseId(db: Db, userId: string): Promise<string | null> {
  const { data, error } = await db.from("care_cases").select("id").eq("user_id", userId)
    .order("created_at").order("id").limit(1).maybeSingle();
  if (error) throw new Error("Could not load care questions.");
  return data?.id ?? null;
}

export async function saveCaseSafety(db: Db, userId: string, caseId: string, context: CaseContext, urgency: Urgency) {
  let query = db.from("care_cases").update({
    warning_answers: { ...context, revision: randomUUID() }, urgency,
    body_area: context.scope,
    // Changing safety answers invalidates any previous provider choice.
    route: null, chosen_provider: null, estimate: null, estimated_savings_cents: null,
  }).eq("user_id", userId).eq("id", caseId);
  query = context.revision ? query.eq("warning_answers->>revision", context.revision) : query.is("warning_answers->>revision", null);
  const { data, error } = await query.select("id").single();
  if (error || !data) throw new Error("Could not save your safety answers.");
}

export async function saveCaseProviders(db: Db, userId: string, caseId: string, route: ComparisonRouteId, providers: ProviderResult[]) {
  if (providers.length === 0) return [];
  const { data, error } = await db.from("case_providers").upsert(providers.map((provider) => ({
    user_id: userId, case_id: caseId, route,
    source: provider.source, external_id: provider.externalId,
    name: provider.name, address: provider.address, phone: provider.phone,
    website: provider.website, rating: provider.rating, rating_count: provider.ratingCount,
    distance_meters: provider.distanceMeters, maps_url: provider.mapsUrl,
    network_status: "not_verified",
  })), { onConflict: "case_id,route,source,external_id" }).select("id, source, external_id");
  if (error) throw new Error("Could not save provider search results.");
  return providers.map((provider) => {
    const row = data.find((item) => item.source === provider.source && item.external_id === provider.externalId);
    if (!row) throw new Error("A provider search result was not saved.");
    return row.id;
  });
}

export async function saveCaseProviderSearch(db: Db, userId: string, caseId: string, context: CaseContext, route: ComparisonRouteId, search: ProviderSearch) {
  let current = context;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!canCompareCare(current)) break;
    let query = db.from("care_cases").update({
      warning_answers: { ...current, revision: randomUUID(), provider_searches: { ...current.provider_searches, [route]: search } },
    }).eq("user_id", userId).eq("id", caseId).eq("urgency", "routine").eq("body_area", "knee_leg");
    query = current.revision ? query.eq("warning_answers->>revision", current.revision) : query.is("warning_answers->>revision", null);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw new Error("Could not save the provider search.");
    if (data) return;
    // A parallel search may have saved another route. Merge with the fresh
    // context once; never overwrite newer safety answers or search results.
    const latest = await getCareCase(db, userId, caseId);
    if (!latest) break;
    current = readCaseContext(latest.warning_answers);
  }
  throw new Error("The care question changed. Review your safety answers and search again.");
}

export async function listCaseProviders(db: Db, userId: string, caseId: string, route: ComparisonRouteId, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("case_providers").select("*")
    .eq("user_id", userId).eq("case_id", caseId).eq("route", route).in("id", ids);
  if (error) throw new Error("Could not load provider search results.");
  return [...data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

export async function getCaseProvider(db: Db, userId: string, caseId: string, route: ComparisonRouteId, providerId: string) {
  const { data, error } = await db.from("case_providers").select("*")
    .eq("user_id", userId).eq("case_id", caseId).eq("route", route).eq("id", providerId).maybeSingle();
  if (error) throw new Error("Could not load this provider.");
  return data;
}

export async function saveCaseChoice(db: Db, userId: string, caseId: string, provider: ChosenProvider, estimate: ReturnType<typeof makeSelectionEstimate>, revision: string) {
  const { data, error } = await db.from("care_cases").update({
    route: estimate.route, chosen_provider: provider, estimate,
    estimated_savings_cents: estimate.comparison.estimated_savings_cents,
  }).eq("user_id", userId).eq("id", caseId).eq("urgency", "routine").eq("body_area", "knee_leg")
    .eq("warning_answers->>revision", revision).select("id").single();
  if (error || !data) throw new Error("Could not save this choice. Review your safety answers and try again.");
}
