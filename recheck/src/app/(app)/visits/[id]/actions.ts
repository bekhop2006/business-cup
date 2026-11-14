"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/auth";
import { createServerSupabase } from "@/lib/db/supabase";
import { findOrCreateFamilyMember, setVisitFamilyMember } from "@/lib/db/visits";

export type FamilyMemberState = { error?: string };

const memberChoice = z.union([z.literal(""), z.uuid()]);
const newMemberName = z
  .string()
  .trim()
  .min(1, "Type a name.")
  .max(100, "That name is too long.");

// Sets whose visit this is. An empty choice clears it.
export async function chooseFamilyMember(
  visitId: string,
  _previous: FamilyMemberState,
  formData: FormData,
): Promise<FamilyMemberState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const choice = memberChoice.safeParse(formData.get("familyMemberId"));
  if (!z.uuid().safeParse(visitId).success || !choice.success) {
    return { error: "Something went wrong. Please try again." };
  }

  const supabase = await createServerSupabase();
  try {
    await setVisitFamilyMember(supabase, user.id, visitId, choice.data || null);
  } catch {
    return { error: "We couldn't save that. Please try again." };
  }
  revalidatePath(`/visits/${visitId}`);
  return {};
}

// Adds a family member by name and makes this their visit.
export async function addFamilyMember(
  visitId: string,
  _previous: FamilyMemberState,
  formData: FormData,
): Promise<FamilyMemberState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = newMemberName.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  if (!z.uuid().safeParse(visitId).success) return { error: "Something went wrong. Please try again." };

  const supabase = await createServerSupabase();
  try {
    const memberId = await findOrCreateFamilyMember(supabase, user.id, name.data);
    await setVisitFamilyMember(supabase, user.id, visitId, memberId);
  } catch {
    return { error: "We couldn't add that person. Please try again." };
  }
  revalidatePath(`/visits/${visitId}`);
  return {};
}
