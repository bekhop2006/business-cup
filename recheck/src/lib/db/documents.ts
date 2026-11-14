import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/db/types";
import type { DocumentFields, LineItemDraft } from "@/lib/documents/validate";

// Typed queries for documents and their line items. Every function filters by
// user_id, so it is safe with both the user client and the admin client.

type Db = SupabaseClient<Database>;
export type DocumentStatus = Database["public"]["Enums"]["document_status"];

export const DOCUMENTS_BUCKET = "documents";

const DOCUMENT_COLUMNS =
  "id, created_at, status, type, file_name, mime_type, storage_path, extracted, visit_id, stated_total_cents, provider_name, patient_name, service_date, insurance_paid_cents, patient_responsibility_cents";

export async function getDocument(db: Db, userId: string, documentId: string) {
  const { data, error } = await db
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the document.");
  return data;
}

export async function listVisitDocuments(db: Db, userId: string, visitId: string) {
  const { data, error } = await db
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("visit_id", visitId)
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error("Could not load the visit's documents.");
  return data;
}

export async function listLineItems(db: Db, userId: string, documentId: string) {
  const { data, error } = await db
    .from("line_items")
    .select("id, document_id, code, description, service_date, quantity, amount_cents")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .order("position");
  if (error) throw new Error("Could not load the document's lines.");
  return data;
}

export async function listLineItemsForDocuments(db: Db, userId: string, documentIds: string[]) {
  if (documentIds.length === 0) return [];
  const { data, error } = await db
    .from("line_items")
    .select("id, document_id, code, description, service_date, quantity, amount_cents")
    .in("document_id", documentIds)
    .eq("user_id", userId)
    .order("position");
  if (error) throw new Error("Could not load the documents' lines.");
  return data;
}

// Documents that are not part of a visit, newest first.
export async function listLooseDocuments(db: Db, userId: string) {
  const { data, error } = await db
    .from("documents")
    .select("id, created_at, status, type, file_name, provider_name")
    .eq("user_id", userId)
    .is("visit_id", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load documents.");
  return data;
}

// Read documents from one date of service that are not in a visit yet.
export async function listLooseReadDocumentsOnDate(db: Db, userId: string, serviceDate: string) {
  const { data, error } = await db
    .from("documents")
    .select("id, provider_name, patient_name")
    .eq("user_id", userId)
    .eq("status", "parsed")
    .eq("service_date", serviceDate)
    .is("visit_id", null);
  if (error) throw new Error("Could not load documents.");
  return data;
}

export async function setDocumentVisit(db: Db, userId: string, documentId: string, visitId: string) {
  const { error } = await db
    .from("documents")
    .update({ visit_id: visitId })
    .eq("id", documentId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not add the document to its visit.");
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
export async function saveDocumentReading(
  db: Db,
  userId: string,
  documentId: string,
  result: {
    lineItems: LineItemDraft[];
    statedTotalCents: number | null;
    fields: DocumentFields;
    status: DocumentStatus;
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
      ...result.fields,
      status: result.status,
      stated_total_cents: result.statedTotalCents,
      ...(result.extracted !== undefined && { extracted: result.extracted }),
    })
    .eq("id", documentId)
    .eq("user_id", userId);
  if (updated.error) throw new Error("Could not save the document.");
}
