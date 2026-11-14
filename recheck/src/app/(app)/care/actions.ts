"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/auth";
import { createCareCase, getCareCase, saveCaseSafety } from "@/lib/db/care";
import { createServerSupabase } from "@/lib/db/supabase";
import { assessUrgency, SAFETY_QUESTIONS, type SafetyAnswers } from "@/lib/care/safety";
import { intakeCareCase } from "@/lib/llm/intake";
import { caseDescriptionSchema, readCaseContext, type Intake } from "@/lib/schemas/intake";

export type CareFormState = { error?: string; description?: string };

export async function startCareCase(_previous: CareFormState, form: FormData): Promise<CareFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const description = String(form.get("description") ?? "");
  const parsed = caseDescriptionSchema.safeParse(description);
  if (!parsed.success) return { error: parsed.error.issues[0].message, description };
  let intake: Intake | null = null;
  try {
    if (form.get("skipSummary") !== "1") intake = await intakeCareCase(parsed.data);
  } catch {
    // Safety questions must still work when the model is unavailable.
  }
  let id: string;
  try {
    id = await createCareCase(await createServerSupabase(), user.id, parsed.data, { intake });
  } catch {
    return { error: "We couldn't save your question. Please try again.", description };
  }
  revalidatePath("/home");
  redirect(`/care/${id}`);
}

export async function saveSafetyAnswers(_previous: CareFormState, form: FormData): Promise<CareFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const input = z.object({ caseId: z.uuid(), scope: z.enum(["knee_leg", "other"]) }).safeParse({
    caseId: form.get("caseId"), scope: form.get("scope"),
  });
  if (!input.success) return { error: "Choose whether this is about knee or leg pain, then try again." };
  const { caseId, scope } = input.data;
  const answers: SafetyAnswers = {};
  for (const { id } of SAFETY_QUESTIONS) {
    const value = form.get(id);
    if (value !== null && value !== "yes" && value !== "no" && value !== "unsure") {
      return { error: "Please check your safety answers and try again." };
    }
    if (value === "yes" || value === "no") answers[id] = value === "yes";
  }
  const urgency = assessUrgency(answers).urgency;
  try {
    const db = await createServerSupabase();
    const careCase = await getCareCase(db, user.id, caseId);
    if (!careCase) return { error: "This care question wasn't found." };
    const context = readCaseContext(careCase.warning_answers);
    await saveCaseSafety(db, user.id, caseId, { ...context, answers, scope }, urgency);
  } catch {
    return { error: "We couldn't save your answers. Please try again. If you need urgent care, don't wait for this page." };
  }
  revalidatePath(`/care/${caseId}`);
  revalidatePath("/home");
  redirect(`/care/${caseId}${urgency === "routine" ? "#next-steps" : ""}`);
}
