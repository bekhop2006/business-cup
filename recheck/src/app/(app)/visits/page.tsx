import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { listLooseDocuments } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { listFamilyMembers, listVisits } from "@/lib/db/visits";
import { formatServiceDate } from "@/lib/dates";
import { STATUS_LABELS, documentTypeLabel } from "@/lib/documents/status";
import { formatCents } from "@/lib/money";
import { VISIT_STATUS_LABELS } from "@/lib/visits/totals";

type Visit = Awaited<ReturnType<typeof listVisits>>[number];

export default async function VisitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const [visits, members, documents] = await Promise.all([
    listVisits(supabase, user.id),
    listFamilyMembers(supabase, user.id),
    listLooseDocuments(supabase, user.id),
  ]);

  const groups = members
    .map((member) => ({
      key: member.id,
      name: member.name,
      visits: visits.filter((visit) => visit.family_member_id === member.id),
    }))
    .filter((group) => group.visits.length > 0);
  const unassigned = visits.filter((visit) => visit.family_member_id === null);
  if (unassigned.length > 0) {
    groups.push({ key: "unassigned", name: "Not assigned to anyone", visits: unassigned });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Visits</h1>
        <Link href="/upload" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Add a document
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-medium">No visits yet</p>
          <p className="mt-1 text-sm text-slate-600">
            When you add a medical bill, its visit will show up here.
          </p>
          <Link href="/upload" className="mt-4 inline-block text-sm font-medium underline">
            Add your first bill
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-8">
            <h2 className="font-semibold">{group.name}</h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
              {group.visits.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </section>
        ))
      )}

      {documents.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold">Documents not in a visit</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {documents.map((document) => (
              <li key={document.id}>
                <Link
                  href={`/documents/${document.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
                >
                  <span>
                    <span className="block font-medium">{document.provider_name ?? document.file_name}</span>
                    <span className="text-sm text-slate-600">{documentTypeLabel(document.type)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      document.status === "needs_review" || document.status === "failed"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-slate-100"
                    }`}
                  >
                    {STATUS_LABELS[document.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function VisitRow({ visit }: { visit: Visit }) {
  return (
    <li>
      <Link href={`/visits/${visit.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
        <span>
          <span className="block font-medium">{visit.provider_name}</span>
          <span className="text-sm text-slate-600">
            {formatServiceDate(visit.service_date)} · {VISIT_STATUS_LABELS[visit.status]}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">{formatCents(visit.patient_owes_cents)}</span>
          <span className="text-xs text-slate-500">you owe</span>
        </span>
      </Link>
    </li>
  );
}
