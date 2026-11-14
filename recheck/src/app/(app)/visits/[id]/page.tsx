import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LineItemsList } from "@/components/LineItemsList";
import { WhoseVisit } from "@/components/WhoseVisit";
import { getCurrentUser } from "@/lib/db/auth";
import { listLineItemsForDocuments, listVisitDocuments } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { getVisit, listFamilyMembers } from "@/lib/db/visits";
import { formatServiceDate } from "@/lib/dates";
import { STATUS_LABELS, documentTypeLabel } from "@/lib/documents/status";
import { formatCents } from "@/lib/money";
import { VISIT_STATUS_LABELS } from "@/lib/visits/totals";
import { addFamilyMember, chooseFamilyMember } from "./actions";

export default async function VisitPage({ params }: PageProps<"/visits/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabase();
  const visit = await getVisit(supabase, user.id, id);
  if (!visit) notFound();
  const [documents, members] = await Promise.all([
    listVisitDocuments(supabase, user.id, id),
    listFamilyMembers(supabase, user.id),
  ]);
  const lines = await listLineItemsForDocuments(
    supabase,
    user.id,
    documents.map((document) => document.id),
  );

  const hasBill = documents.some((document) => document.type === "bill");
  const hasEob = documents.some((document) => document.type === "eob");

  return (
    <>
      <Link href="/visits" className="text-sm text-slate-600 hover:underline">
        ← All visits
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{visit.provider_name}</h1>
          <p className="mt-1 text-slate-600">{formatServiceDate(visit.service_date)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
          {VISIT_STATUS_LABELS[visit.status]}
        </span>
      </div>

      <WhoseVisit
        members={members}
        currentId={visit.family_member_id}
        chooseAction={chooseFamilyMember.bind(null, visit.id)}
        addAction={addFamilyMember.bind(null, visit.id)}
      />

      <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        <Total label="Billed" cents={visit.billed_cents} />
        <Total label="Paid by insurance" cents={visit.insurance_paid_cents} />
        <Total label="You owe" cents={visit.patient_owes_cents} strong />
      </dl>

      {(!hasEob || !hasBill) && (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          {!hasEob
            ? "When your insurer sends the Explanation of Benefits for this visit, add it here so the bill can be compared with what insurance says you owe."
            : `When the bill from ${visit.provider_name} arrives, add it here so it can be compared with your insurer's statement.`}{" "}
          <Link href="/upload" className="font-medium underline">
            Add a document
          </Link>
        </p>
      )}

      <h2 className="mt-10 font-semibold">Documents</h2>
      {documents.map((document) => (
        <section key={document.id} className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">{documentTypeLabel(document.type)}</h3>
            <Link href={`/documents/${document.id}`} className="text-sm underline">
              {document.status === "parsed" ? "Open" : STATUS_LABELS[document.status]}
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            {document.file_name}
            {document.patient_responsibility_cents !== null &&
              ` · says you owe ${formatCents(document.patient_responsibility_cents)}`}
          </p>
          <LineItemsList lines={lines.filter((line) => line.document_id === document.id)} />
        </section>
      ))}
    </>
  );
}

function Total({ label, cents, strong = false }: { label: string; cents: number; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${strong ? "bg-slate-900 text-white" : "bg-slate-50"}`}>
      <dt className={`text-xs sm:text-sm ${strong ? "text-slate-300" : "text-slate-600"}`}>{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{formatCents(cents)}</dd>
    </div>
  );
}
