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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Your family billing record
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your bills</h1>
        <Link href="/upload" className="inline-flex min-h-11 items-center gap-6 rounded-md bg-[var(--rc-accent)] px-5 py-3 text-sm font-medium text-[var(--rc-navy)] hover:opacity-90">
          Add a document <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <p className="mt-3 text-sm text-[var(--rc-navy)]/70">
        Your family&apos;s bills and insurance statements, organized by visit.
        Open a visit to review its charges and next steps.
      </p>

      {visits.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--rc-navy)]/15 bg-[var(--rc-navy)]/4 px-6 py-12 text-center">
          <span aria-hidden="true" className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-[var(--rc-navy)]/25 text-xl">↥</span>
          <h2 className="font-serif text-3xl">Start with one bill.</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--rc-navy)]/70">
            Add a medical bill or insurance statement. We&apos;ll read it and
            organize its charges into a visit for you to review.
          </p>
          <Link href="/upload" className="mt-5 inline-block py-2 text-sm font-semibold underline underline-offset-4">
            Add your first bill
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{group.name}</h2>
              <span className="text-xs text-[var(--rc-navy)]/65">
                {group.visits.length} {group.visits.length === 1 ? "visit" : "visits"}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 overflow-hidden rounded-lg border border-[var(--rc-navy)]/15">
              {group.visits.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </section>
        ))
      )}

      {documents.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold">Documents to finish</h2>
          <p className="mt-1 text-sm text-[var(--rc-navy)]/70">
            These documents are still being read or need details before they can
            join a visit. Open one to check its progress.
          </p>
          <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 rounded-xl border border-[var(--rc-navy)]/15">
            {documents.map((document) => (
              <li key={document.id}>
                <Link
                  href={`/documents/${document.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-[var(--rc-navy)]/4"
                >
                  <span>
                    <span className="block break-words font-medium">{document.provider_name ?? document.file_name}</span>
                    <span className="text-sm text-[var(--rc-navy)]/70">{documentTypeLabel(document.type)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      document.status === "needs_review" || document.status === "failed"
                        ? "bg-[var(--rc-red)]/8 text-[var(--rc-red)]"
                        : "bg-[var(--rc-navy)]/8"
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
      <Link href={`/visits/${visit.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--rc-navy)]/4">
        <span className="min-w-0">
          <span className="block break-words font-medium">{visit.provider_name}</span>
          <span className="text-sm text-[var(--rc-navy)]/70">
            {formatServiceDate(visit.service_date)} · {VISIT_STATUS_LABELS[visit.status]}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">{formatCents(visit.patient_owes_cents)}</span>
          <span className="text-xs text-[var(--rc-navy)]/65">you owe <span aria-hidden="true">↗</span></span>
        </span>
      </Link>
    </li>
  );
}
