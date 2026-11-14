import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/db/types";
import type { LineItemDraft } from "@/lib/documents/validate";
import type { DocumentType } from "@/lib/schemas/extracted";

// Typed queries for documents and their line items. Every function filters by
// user_id, so it is safe with both the user client and the admin client.

type Db = SupabaseClient<Database>;
export type DocumentStatus = Database["public"]["Enums"]["document_status"];

export const DOCUMENTS_BUCKET = "documents";

export async function getDocument(db: Db, userId: string, documentId: string) {
  const { data, error } = await db
    .from("documents")
    .select("id, created_at, status, type, file_name, mime_type, storage_path, extracted, stated_total_cents, visit_id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the document.");
  return data;
}

export async function listLineItems(db: Db, userId: string, documentId: string) {
  const { data, error } = await db
    .from("line_items")
    .select("id, code, description, service_date, quantity, amount_cents")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .order("position");
  if (error) throw new Error("Could not load the document's lines.");
  return data;
}

// Documents that are not part of a visit yet, newest first.
export async function listLooseDocuments(db: Db, userId: string) {
  const { data, error } = await db
    .from("documents")
    .select("id, created_at, status, type, file_name, extracted")
    .eq("user_id", userId)
    .is("visit_id", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load documents.");
  return data;
}

export async function setDocumentStatus(
  db: Db,
  userId: string,
  documentId: string,
  status: DocumentStatus,
) {
  const { error } = await db
    .from("documents")
    .update({ status })
    .eq("id", documentId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update the document.");
}

// Replaces the document's line items and records the result of reading it.
export async function saveDocumentLines(
  db: Db,
  userId: string,
  documentId: string,
  result: {
    lineItems: LineItemDraft[];
    statedTotalCents: number | null;
    status: DocumentStatus;
    type?: DocumentType | null;
    extracted?: Json | null;
  },
) {
  const removed = await db
    .from("line_items")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId);
  if (removed.error) throw new Error("Could not replace the document's lines.");

  if (result.lineItems.length > 0) {
    const inserted = await db.from("line_items").insert(
      result.lineItems.map((line, position) => ({
        ...line,
        position,
        document_id: documentId,
        user_id: userId,
      })),
    );
    if (inserted.error) throw new Error("Could not save the document's lines.");
  }

  const updated = await db
    .from("documents")
    .update({
      status: result.status,
      stated_total_cents: result.statedTotalCents,
      ...(result.type !== undefined && { type: result.type }),
      ...(result.extracted !== undefined && { extracted: result.extracted }),
    })
    .eq("id", documentId)
    .eq("user_id", userId);
  if (updated.error) throw new Error("Could not save the document.");
}
