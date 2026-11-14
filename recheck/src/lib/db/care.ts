import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { CaseContext } from "@/lib/schemas/intake";
import type { Urgency } from "@/lib/care/safety";

type Db = SupabaseClient<Database>;
export type CareCase = Database["public"]["Tables"]["care_cases"]["Row"];

export async function createCareCase(db: Db, userId: string, description: string, context: CaseContext) {
  const { data, error } = await db.from("care_cases").insert({
    user_id: userId,
    description,
    summary: context.intake?.summary ?? null,
    body_area: context.intake?.body_area ?? null,
    warning_answers: context,
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

export async function saveCaseSafety(db: Db, userId: string, caseId: string, context: CaseContext, urgency: Urgency) {
  const { data, error } = await db.from("care_cases").update({
    warning_answers: context, urgency,
    body_area: context.scope,
    // Changing safety answers invalidates any previous provider choice.
    route: null, chosen_provider: null, estimate: null, estimated_savings_cents: null,
  }).eq("user_id", userId).eq("id", caseId).select("id").single();
  if (error || !data) throw new Error("Could not save your safety answers.");
}
