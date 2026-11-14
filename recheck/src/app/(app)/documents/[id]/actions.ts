"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/db/auth";
import { getDocument, saveDocumentReading } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { reviewSchema, reviewToDocument } from "@/lib/documents/review";
import { attachDocumentToVisit } from "@/lib/visits/attach";
import { explainVisitText } from "@/lib/visits/refresh";

export type ReviewState = { error?: string };

// Saves what a person checked on the review screen, marks the document as
// read and puts it into its visit.
export async function saveReview(
  documentId: string,
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!z.uuid().safeParse(documentId).success) return { error: "Document not found." };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload")));
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = reviewToDocument(parsed.data);
  if ("error" in result) return { error: result.error };

  const supabase = await createServerSupabase();
  const document = await getDocument(supabase, user.id, documentId);
  if (!document || document.status !== "needs_review") {
    return { error: "This document can't be changed right now. Reload the page." };
  }

  await saveDocumentReading(supabase, user.id, documentId, { ...result, status: "parsed" });
  const visitId = await attachDocumentToVisit(supabase, user.id, documentId);
  if (visitId) {
    const userId = user.id;
    after(() => explainVisitText(createAdminSupabase(), userId, visitId));
  }
  redirect(visitId ? `/visits/${visitId}` : `/documents/${documentId}`);
}
