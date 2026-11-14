import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { listLooseDocuments } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { listVisits } from "@/lib/db/visits";
import { STATUS_LABELS, documentTypeLabel } from "@/lib/documents/status";
import { extractedDocumentSchema } from "@/lib/schemas/extracted";

export default async function VisitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const [visits, documents] = await Promise.all([
    listVisits(supabase),
    listLooseDocuments(supabase, user.id),
  ]);

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
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {visits.map((visit) => (
            <li key={visit.id} className="flex justify-between gap-4 p-4">
              <span className="font-medium">{visit.provider_name}</span>
              <span className="text-sm text-slate-600">{visit.service_date}</span>
            </li>
          ))}
        </ul>
      )}

      {documents.length > 0 && (
        <>
          <h2 className="mt-10 font-semibold">Documents</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {documents.map((document) => {
              const extracted = extractedDocumentSchema.safeParse(document.extracted).data;
              return (
                <li key={document.id}>
                  <Link
                    href={`/documents/${document.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
                  >
                    <span>
                      <span className="block font-medium">
                        {extracted?.provider_name ?? document.file_name}
                      </span>
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
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
