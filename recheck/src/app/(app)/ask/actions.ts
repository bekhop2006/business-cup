"use server";

import { redirect } from "next/navigation";
import { canAskQuestion } from "@/lib/billing/plan";
import { countQuestions, logQuestion } from "@/lib/db/ask";
import { getCurrentUser } from "@/lib/db/auth";
import { getInsurancePlan, getPlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import type { AskResult } from "@/lib/knowledge/answer";
import { askRecheck } from "@/lib/llm/ask";
import { askQuestionSchema } from "@/lib/schemas/ask";

export type AskState = { question?: string; result?: AskResult; error?: string; paywall?: boolean; lastFree?: boolean };

export async function askAction(_previous: AskState, form: FormData): Promise<AskState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = askQuestionSchema.safeParse(form.get("question") ?? "");
  const question = String(form.get("question") ?? "");
  if (!parsed.success) return { question, error: parsed.error.issues[0].message };

  const db = await createServerSupabase();
  const [plan, asked] = await Promise.all([getPlan(db, user.id), countQuestions(db, user.id)]);
  if (!canAskQuestion(plan, asked)) return { question, paywall: true };

  let result: AskResult | null;
  try {
    const [profile, insurance] = await Promise.all([
      getProfile(db, user.id),
      getInsurancePlan(db, user.id, new Date().getUTCFullYear()),
    ]);
    result = await askRecheck(db, parsed.data, { zip: profile?.zip_code ?? null, planType: insurance?.plan_type ?? null });
  } catch {
    return { question, error: "We couldn't answer right now. Please try again in a minute." };
  }
  if (!result) return { question, error: "We couldn't answer that clearly. Try asking it another way." };

  await logQuestion(db, user.id).catch(() => undefined);
  return { question, result, lastFree: plan === "free" };
}
