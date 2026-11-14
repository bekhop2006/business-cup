import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export async function listVisits(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("visits")
    .select("id, provider_name, service_date")
    .order("service_date", { ascending: false });

  if (error) throw new Error("Could not load visits.");
  return data;
}
