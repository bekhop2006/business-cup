"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/auth";
import { saveInsurancePlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { parseMoneyToCents } from "@/lib/money";

export type InsurancePlanState = { error?: string; saved?: boolean };

const planSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  deductible: z.string().trim().min(1, "Enter your deductible.").max(20),
  oopMax: z.string().trim().min(1, "Enter your out-of-pocket maximum.").max(20),
});

export async function saveInsurance(
  _previous: InsurancePlanState,
  formData: FormData,
): Promise<InsurancePlanState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = planSchema.safeParse({
    year: formData.get("year"),
    deductible: formData.get("deductible"),
    oopMax: formData.get("oopMax"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const deductible = parseMoneyToCents(parsed.data.deductible);
  const oopMax = parseMoneyToCents(parsed.data.oopMax);
  if (deductible === null || deductible < 0) return { error: "Check the deductible amount." };
  if (oopMax === null || oopMax < 0) return { error: "Check the out-of-pocket maximum." };
  if (oopMax < deductible) {
    return { error: "The out-of-pocket maximum is usually higher than the deductible. Check both numbers." };
  }

  try {
    await saveInsurancePlan(await createServerSupabase(), user.id, {
      year: parsed.data.year,
      deductible_cents: deductible,
      oop_max_cents: oopMax,
    });
  } catch {
    return { error: "We couldn't save your plan. Please try again." };
  }
  revalidatePath("/dashboard");
  return { saved: true };
}
