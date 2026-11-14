import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/billing/plan";
import type { Database } from "@/lib/db/types";
import type { AboutYou, InsuranceProfileValues } from "@/lib/profile/onboarding";

// Profiles: users may update only their own details (name, ZIP, household
// size, onboarded at); the plan and billing columns are written by the server
// with the admin client.

type Db = SupabaseClient<Database>;

export async function getProfile(db: Db, userId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("email, plan, stripe_customer_id, full_name, zip_code, household_size, onboarded_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the profile.");
  return data;
}

export async function saveAboutYou(db: Db, userId: string, details: AboutYou) {
  const { error } = await db.from("profiles").update(details).eq("user_id", userId);
  if (error) throw new Error("Could not save your details.");
}

export async function markOnboarded(db: Db, userId: string) {
  const { error } = await db
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error("Could not finish onboarding.");
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

// The insurance profile for a year (one row per user and year).
export async function getInsurancePlan(db: Db, userId: string, year: number) {
  const { data, error } = await db
    .from("insurance_plans")
    .select(
      "insurer_name, plan_name, plan_type, deductible_cents, deductible_met_cents, oop_max_cents, oop_met_cents, coinsurance_bps, copay_primary_cents, copay_specialist_cents, copay_urgent_care_cents, copay_er_cents, updated_at",
    )
    .eq("user_id", userId)
    .eq("year", year)
    .maybeSingle();
  if (error) throw new Error("Could not load the insurance plan.");
  return data;
}

// Saves some or all insurance details; fields left out keep their value.
export async function saveInsurancePlan(
  db: Db,
  userId: string,
  plan: { year: number } & Partial<InsuranceProfileValues>,
) {
  const { error } = await db
    .from("insurance_plans")
    .upsert({ ...plan, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,year" });
  if (error) throw new Error("Could not save the insurance plan.");
}
