import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/billing/plan";
import type { Database } from "@/lib/db/types";

// Profiles are read by the user and written only by the server with the
// admin client (row-level security lets users read, not write, their profile).

type Db = SupabaseClient<Database>;

export async function getProfile(db: Db, userId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("email, plan, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the profile.");
  return data;
}

export async function getPlan(db: Db, userId: string): Promise<Plan> {
  return (await getProfile(db, userId))?.plan ?? "free";
}

export async function setStripeCustomerId(admin: Db, userId: string, customerId: string) {
  const { error } = await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
  if (error) throw new Error("Could not save the billing customer.");
}

export async function setPlan(admin: Db, userId: string, plan: Plan) {
  const { error } = await admin.from("profiles").update({ plan }).eq("user_id", userId);
  if (error) throw new Error("Could not update the plan.");
}

export async function findUserIdByStripeCustomer(admin: Db, customerId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error("Could not look up the billing customer.");
  return data?.user_id ?? null;
}

export async function getInsurancePlan(db: Db, userId: string, year: number) {
  const { data, error } = await db
    .from("insurance_plans")
    .select("deductible_cents, oop_max_cents")
    .eq("user_id", userId)
    .eq("year", year)
    .maybeSingle();
  if (error) throw new Error("Could not load the insurance plan.");
  return data;
}

export async function saveInsurancePlan(
  db: Db,
  userId: string,
  plan: { year: number; deductible_cents: number; oop_max_cents: number },
) {
  const { error } = await db
    .from("insurance_plans")
    .upsert({ ...plan, user_id: userId }, { onConflict: "user_id,year" });
  if (error) throw new Error("Could not save the insurance plan.");
}
