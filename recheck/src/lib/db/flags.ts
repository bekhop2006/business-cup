import type { SupabaseClient } from "@supabase/supabase-js";
import type { FlagDraft } from "@/lib/checks/types";
import type { Database } from "@/lib/db/types";

// Typed queries for flags and dispute drafts. Every function filters by
// user_id, so it is safe with both the user client and the admin client.

type Db = SupabaseClient<Database>;

export async function listVisitFlags(db: Db, userId: string, visitId: string) {
  const { data, error } = await db
    .from("flags")
    .select("id, type, document_id, line_item_id, message, explanation, potential_savings_cents")
    .eq("visit_id", visitId)
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error("Could not load the visit's flags.");
  return data;
}

// Pipeline step 5: the visit's flags are always the latest result of the checks.
export async function replaceVisitFlags(db: Db, userId: string, visitId: string, flags: FlagDraft[]) {
  const removed = await db.from("flags").delete().eq("visit_id", visitId).eq("user_id", userId);
  if (removed.error) throw new Error("Could not replace the visit's flags.");
  if (flags.length === 0) return;
  const inserted = await db
    .from("flags")
    .insert(flags.map((flag) => ({ ...flag, visit_id: visitId, user_id: userId })));
  if (inserted.error) throw new Error("Could not save the visit's flags.");
}

export async function saveFlagExplanations(
  db: Db,
  userId: string,
  explanations: { id: string; explanation: string }[],
) {
  for (const { id, explanation } of explanations) {
    const { error } = await db.from("flags").update({ explanation }).eq("id", id).eq("user_id", userId);
    if (error) throw new Error("Could not save a flag explanation.");
  }
}

export async function getDispute(db: Db, userId: string, visitId: string) {
  const { data, error } = await db
    .from("disputes")
    .select("id, status, letter_text, call_script, created_at")
    .eq("visit_id", visitId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the dispute.");
  return data;
}

export async function saveDisputeDraft(
  db: Db,
  userId: string,
  visitId: string,
  draft: { letter_text: string; call_script: string },
) {
  const { error } = await db
    .from("disputes")
    .upsert(
      { ...draft, visit_id: visitId, user_id: userId, status: "draft" },
      { onConflict: "visit_id" },
    );
  if (error) throw new Error("Could not save the dispute letter.");
}

export async function listUserFlags(db: Db, userId: string) {
  const { data, error } = await db
    .from("flags")
    .select("visit_id, type, potential_savings_cents")
    .eq("user_id", userId);
  if (error) throw new Error("Could not load flags.");
  return data;
}
