import { z } from "zod";
import { getCurrentUser } from "@/lib/db/auth";
import { listVisitDocuments } from "@/lib/db/documents";
import { listVisitFlags, saveDisputeDraft } from "@/lib/db/flags";
import { createServerSupabase } from "@/lib/db/supabase";
import { getVisit } from "@/lib/db/visits";
import { LlmUnavailableError } from "@/lib/llm/client";
import { writeDispute } from "@/lib/llm/dispute";
import { extractedDocumentSchema } from "@/lib/schemas/extracted";

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

const newest = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

// Writes the dispute letter and call script for a visit from its flags.
export async function POST(_request: Request, context: RouteContext<"/api/visits/[id]/dispute">) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return fail("Visit not found.", 404);

  const supabase = await createServerSupabase();
  const visit = await getVisit(supabase, user.id, id.data);
  if (!visit) return fail("Visit not found.", 404);
  const [flags, documents] = await Promise.all([
    listVisitFlags(supabase, user.id, visit.id),
    listVisitDocuments(supabase, user.id, visit.id),
  ]);
  if (flags.length === 0) return fail("We didn't find anything to dispute on this visit.", 400);

  const read = documents.filter((document) => document.status === "parsed");
  const bill = newest(read.filter((document) => document.type === "bill"));
  const eob = newest(read.filter((document) => document.type === "eob"));
  const printed = (document: (typeof read)[number] | undefined) =>
    extractedDocumentSchema.safeParse(document?.extracted).data;

  try {
    const draft = await writeDispute({
      provider_name: visit.provider_name,
      service_date: visit.service_date,
      patient_name: bill?.patient_name ?? eob?.patient_name ?? null,
      account_number: printed(bill)?.account_number ?? null,
      claim_number: printed(eob)?.claim_number ?? printed(bill)?.claim_number ?? null,
      insurer_name: printed(eob)?.insurer_name ?? printed(bill)?.insurer_name ?? null,
      bill_says_you_owe_cents: bill?.patient_responsibility_cents ?? null,
      insurer_says_you_owe_cents: eob?.patient_responsibility_cents ?? null,
      flags,
    });
    if (!draft) return fail("We couldn't write the letter just now. Please try again.", 502);

    const saved = { letter_text: draft.letter, call_script: draft.call_script };
    await saveDisputeDraft(supabase, user.id, visit.id, saved);
    return Response.json(saved);
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return fail("We couldn't write the letter just now. Please try again in a minute.", 503);
    }
    throw error;
  }
}
