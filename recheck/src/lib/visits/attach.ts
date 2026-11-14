import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDocument,
  listLineItemsForDocuments,
  listLooseReadDocumentsOnDate,
  listVisitDocuments,
  setDocumentVisit,
} from "@/lib/db/documents";
import type { Database } from "@/lib/db/types";
import {
  createVisit,
  findOrCreateFamilyMember,
  getVisit,
  listVisitsOnDate,
  saveVisitTotals,
  setVisitFamilyMember,
} from "@/lib/db/visits";
import { findMatchingVisit, samePerson, sameProvider } from "@/lib/visits/match";
import { computeVisitTotals } from "@/lib/visits/totals";

type Db = SupabaseClient<Database>;

// Pipeline step 4 (match) and step 7 (total): puts a read document into the
// visit for its provider, date and patient, creating the visit and the family
// member when needed, then recomputes the visit's totals.
// Returns the visit id, or null when the document lacks a provider or a date.
export async function attachDocumentToVisit(
  db: Db,
  userId: string,
  documentId: string,
): Promise<string | null> {
  const document = await getDocument(db, userId, documentId);
  if (!document || document.status !== "parsed") return null;
  const { provider_name: provider, service_date: serviceDate, patient_name: patient } = document;
  if (!provider || !serviceDate) return null;

  const familyMemberId = patient ? await findOrCreateFamilyMember(db, userId, patient) : null;
  const visits = await listVisitsOnDate(db, userId, serviceDate);
  const match = findMatchingVisit(visits, {
    provider_name: provider,
    service_date: serviceDate,
    family_member_id: familyMemberId,
  });

  const visitId =
    match?.id ??
    (await createVisit(db, userId, {
      provider_name: provider,
      service_date: serviceDate,
      family_member_id: familyMemberId,
    }));
  if (match && match.family_member_id === null && familyMemberId) {
    await setVisitFamilyMember(db, userId, visitId, familyMemberId);
  }
  await setDocumentVisit(db, userId, documentId, visitId);

  // Earlier documents of the same visit that were read but left on their own.
  for (const other of await listLooseReadDocumentsOnDate(db, userId, serviceDate)) {
    const samePatient = !other.patient_name || !patient || samePerson(other.patient_name, patient);
    if (other.provider_name && sameProvider(other.provider_name, provider) && samePatient) {
      await setDocumentVisit(db, userId, other.id, visitId);
    }
  }

  await refreshVisitTotals(db, userId, visitId);
  return visitId;
}

export async function refreshVisitTotals(db: Db, userId: string, visitId: string) {
  const visit = await getVisit(db, userId, visitId);
  if (!visit) return;
  const documents = await listVisitDocuments(db, userId, visitId);
  const lines = await listLineItemsForDocuments(
    db,
    userId,
    documents.map((document) => document.id),
  );

  const totals = computeVisitTotals(
    documents
      .filter((document) => document.status === "parsed")
      .map((document) => ({
        type: document.type,
        created_at: document.created_at,
        stated_total_cents: document.stated_total_cents,
        insurance_paid_cents: document.insurance_paid_cents,
        patient_responsibility_cents: document.patient_responsibility_cents,
        line_amounts_cents: lines
          .filter((line) => line.document_id === document.id)
          .map((line) => line.amount_cents),
      })),
    visit.status,
  );
  await saveVisitTotals(db, userId, visitId, totals);
}
