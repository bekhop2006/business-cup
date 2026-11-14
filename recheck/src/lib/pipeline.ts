import { createAdminSupabase } from "@/lib/db/admin";
import {
  DOCUMENTS_BUCKET,
  getDocument,
  saveDocumentLines,
  setDocumentStatus,
} from "@/lib/db/documents";
import { validateExtraction } from "@/lib/documents/validate";
import { LlmUnavailableError } from "@/lib/llm/client";
import { extractDocument } from "@/lib/llm/extract";

// Reads an uploaded document in the background. Steps (docs/STRUCTURE.md):
// 1. store (done by the upload route), 2. extract, 3. validate.
// Matching, checks, explanations and totals are added in later stages.
//
// Runs without a user session, so it uses the admin client and passes userId
// to every query. Logs ids and outcomes only, never document contents.
export async function processDocument(userId: string, documentId: string): Promise<void> {
  const db = createAdminSupabase();

  try {
    const document = await getDocument(db, userId, documentId);
    if (!document) return;
    await setDocumentStatus(db, userId, documentId, "processing");

    const bytes = await downloadDocument(document.storage_path);
    const extracted = await extractDocument({
      bytes,
      mimeType: document.mime_type,
      fileName: document.file_name,
    });
    const validated = validateExtraction(extracted);

    await saveDocumentLines(db, userId, documentId, {
      lineItems: validated.lineItems,
      statedTotalCents: validated.statedTotalCents,
      status: validated.problems.length > 0 ? "needs_review" : "parsed",
      type: extracted?.document_type ?? null,
      extracted,
    });
  } catch (error) {
    const reason = error instanceof LlmUnavailableError ? `llm_unavailable_${error.status}` : "error";
    console.error("Document processing failed", { documentId, reason });
    await setDocumentStatus(db, userId, documentId, "failed").catch(() => undefined);
  }

  async function downloadDocument(storagePath: string): Promise<Uint8Array> {
    const { data, error } = await db.storage.from(DOCUMENTS_BUCKET).download(storagePath);
    if (error) throw new Error("Could not download the document.");
    return new Uint8Array(await data.arrayBuffer());
  }
}
