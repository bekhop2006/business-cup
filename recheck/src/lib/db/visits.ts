import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { cleanPersonName, samePerson } from "@/lib/visits/match";
import type { VisitTotals } from "@/lib/visits/totals";

// Typed queries for visits and family members. Every function filters by
// user_id, so it is safe with both the user client and the admin client.

type Db = SupabaseClient<Database>;

const VISIT_COLUMNS =
  "id, provider_name, service_date, status, family_member_id, billed_cents, insurance_paid_cents, patient_owes_cents";

export async function listVisits(db: Db, userId: string) {
  const { data, error } = await db
    .from("visits")
    .select(VISIT_COLUMNS)
    .eq("user_id", userId)
    .order("service_date", { ascending: false });
  if (error) throw new Error("Could not load visits.");
  return data;
}

export async function getVisit(db: Db, userId: string, visitId: string) {
  const { data, error } = await db
    .from("visits")
    .select(VISIT_COLUMNS)
    .eq("id", visitId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the visit.");
  return data;
}

export async function listVisitsOnDate(db: Db, userId: string, serviceDate: string) {
  const { data, error } = await db
    .from("visits")
    .select("id, provider_name, service_date, family_member_id")
    .eq("user_id", userId)
    .eq("service_date", serviceDate);
  if (error) throw new Error("Could not load visits.");
  return data;
}

export async function createVisit(
  db: Db,
  userId: string,
  visit: { provider_name: string; service_date: string; family_member_id: string | null },
): Promise<string> {
  const { data, error } = await db
    .from("visits")
    .insert({ ...visit, user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error("Could not create the visit.");
  return data.id;
}

export async function setVisitFamilyMember(
  db: Db,
  userId: string,
  visitId: string,
  familyMemberId: string | null,
) {
  const { error } = await db
    .from("visits")
    .update({ family_member_id: familyMemberId })
    .eq("id", visitId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update the visit.");
}

export async function saveVisitTotals(db: Db, userId: string, visitId: string, totals: VisitTotals) {
  const { error } = await db
    .from("visits")
    .update(totals)
    .eq("id", visitId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update the visit's totals.");
}

export async function listFamilyMembers(db: Db, userId: string) {
  const { data, error } = await db
    .from("family_members")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");
  if (error) throw new Error("Could not load family members.");
  return data;
}

// Returns the id of the family member with this name, adding them if needed.
export async function findOrCreateFamilyMember(db: Db, userId: string, rawName: string): Promise<string> {
  const name = cleanPersonName(rawName);
  const existing = (await listFamilyMembers(db, userId)).find((member) => samePerson(member.name, name));
  if (existing) return existing.id;

  const { data, error } = await db
    .from("family_members")
    .insert({ name, user_id: userId })
    .select("id")
    .single();
  if (!error) return data.id;

  // Someone else added the same name a moment ago.
  const added = (await listFamilyMembers(db, userId)).find((member) => samePerson(member.name, name));
  if (added) return added.id;
  throw new Error("Could not add the family member.");
}

// The user's first visit: its check is free on the free plan.
export async function getFirstVisitId(db: Db, userId: string): Promise<string | null> {
  const { data, error } = await db
    .from("visits")
    .select("id")
    .eq("user_id", userId)
    .order("created_at")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load visits.");
  return data?.id ?? null;
}
