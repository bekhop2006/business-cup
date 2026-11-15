import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { PreventiveRecord } from "@/lib/preventive/schedule";

// When the person last had each preventive service. RLS keeps rows private.

type Db = SupabaseClient<Database>;

export async function getPreventiveRecords(db: Db, userId: string): Promise<PreventiveRecord[]> {
  const { data, error } = await db
    .from("preventive_records")
    .select("service_id, last_done_on, method")
    .eq("user_id", userId);
  if (error) throw new Error("Could not load preventive care.");
  return data;
}

// Saves the services on the form: a date upserts the row, an empty answer
// ("not yet" or "not sure") removes it.
export async function savePreventiveRecords(
  db: Db,
  userId: string,
  answers: { serviceId: string; lastDoneOn: string | null; method: string | null }[],
) {
  const done = answers.filter((answer) => answer.lastDoneOn !== null);
  const cleared = answers.filter((answer) => answer.lastDoneOn === null).map((answer) => answer.serviceId);

  if (done.length > 0) {
    const { error } = await db.from("preventive_records").upsert(
      done.map((answer) => ({
        user_id: userId,
        service_id: answer.serviceId,
        last_done_on: answer.lastDoneOn as string,
        method: answer.method,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,service_id" },
    );
    if (error) throw new Error("Could not save preventive care.");
  }
  if (cleared.length > 0) {
    const { error } = await db
      .from("preventive_records")
      .delete()
      .eq("user_id", userId)
      .in("service_id", cleared);
    if (error) throw new Error("Could not save preventive care.");
  }
}
