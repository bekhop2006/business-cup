import type { SupabaseClient } from "@supabase/supabase-js";
import { runChecks } from "@/lib/checks";
import { listLineItemsForDocuments, listVisitDocuments, saveLineExplanations } from "@/lib/db/documents";
import { listVisitFlags, replaceVisitFlags, saveFlagExplanations } from "@/lib/db/flags";
import type { Database } from "@/lib/db/types";
import { getVisit, saveVisitTotals } from "@/lib/db/visits";
import { explainVisit } from "@/lib/llm/explain";
import { computeVisitTotals } from "@/lib/visits/totals";

type Db = SupabaseClient<Database>;

async function loadReadDocuments(db: Db, userId: string, visitId: string) {
  const documents = (await listVisitDocuments(db, userId, visitId)).filter(
    (document) => document.status === "parsed",
  );
  const lines = await listLineItemsForDocuments(
    db,
    userId,
    documents.map((document) => document.id),
  );
  return { documents, lines };
}

// Pipeline steps 5 (check) and 7 (total), all in code: recomputes the visit's
// totals and replaces its flags with the latest result of every check.
export async function refreshVisit(db: Db, userId: string, visitId: string) {
  const visit = await getVisit(db, userId, visitId);
  if (!visit) return;
  const { documents, lines } = await loadReadDocuments(db, userId, visitId);

  const totals = computeVisitTotals(
    documents.map((document) => ({
      ...document,
      line_amounts_cents: lines
        .filter((line) => line.document_id === document.id)
        .map((line) => line.amount_cents),
    })),
    visit.status,
  );
  await saveVisitTotals(db, userId, visitId, totals);
  await replaceVisitFlags(db, userId, visitId, runChecks({ documents, lines }));
}

// Pipeline step 6: plain-language text for lines that have none yet and for
// every flag. The LLM receives the flags; it does not create them. A failure
// here leaves the visit without explanations, never without its numbers.
export async function explainVisitText(db: Db, userId: string, visitId: string) {
  try {
    const { lines } = await loadReadDocuments(db, userId, visitId);
    const flags = await listVisitFlags(db, userId, visitId);
    const unexplained = lines.filter((line) => !line.plain_explanation);
    if (unexplained.length === 0 && flags.length === 0) return;

    const result = await explainVisit({ lines: unexplained, flags });
    if (!result) return;
    await saveLineExplanations(db, userId, result.lines);
    await saveFlagExplanations(db, userId, result.flags);
  } catch {
    console.error("Explaining a visit failed", { visitId });
  }
}
