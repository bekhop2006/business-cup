import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

// Counts "Ask Recheck" questions for the free limit. The question text is never stored.

type Db = SupabaseClient<Database>;

export async function countQuestions(db: Db, userId: string): Promise<number> {
  const { count, error } = await db.from("ask_log").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw new Error("Could not load your questions.");
  return count ?? 0;
}

export async function logQuestion(db: Db, userId: string) {
  const { error } = await db.from("ask_log").insert({ user_id: userId });
  if (error) throw new Error("Could not save your question.");
}
