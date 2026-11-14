import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LineItemsList } from "@/components/LineItemsList";
import { RefreshWhileReading } from "@/components/RefreshWhileReading";
import { RetryReadingButton } from "@/components/RetryReadingButton";
import { ReviewForm } from "@/components/ReviewForm";
import { getCurrentUser } from "@/lib/db/auth";
import { getDocument, listLineItems } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { formatServiceDate } from "@/lib/dates";
import {
  STATUS_LABELS,
  canRetryReading,
  documentTypeLabel,
  isBeingRead,
} from "@/lib/documents/status";
import { describeProblem, validateExtraction } from "@/lib/documents/validate";
import { formatCents, formatCentsForInput } from "@/lib/money";
import { extractedDocumentSchema } from "@/lib/schemas/extracted";
import { saveReview } from "./actions";

const amountForInput = (cents: number | null) => (cents === null ? "" : formatCentsForInput(cents));
const amountOrNotStated = (cents: number | null) => (cents === null ? "Not stated" : formatCents(cents));

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabase();
  const document = await getDocument(supabase, user.id, id);
  if (!document) notFound();
  const lines = await listLineItems(supabase, user.id, id);
  const extracted = extractedDocumentSchema.safeParse(document.extracted).data ?? null;

  const subtitle = [
    documentTypeLabel(document.type),
    document.service_date && formatServiceDate(document.service_date),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Link
        href={document.visit_id ? `/visits/${document.visit_id}` : "/visits"}
        className="text-sm text-slate-600 hover:underline"
      >
        {document.visit_id ? "← Back to the visit" : "← All visits"}
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {document.provider_name ?? document.file_name}
          </h1>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
          {STATUS_LABELS[document.status]}
        </span>
      </div>

      {isBeingRead(document.status) && (
        <section className="mt-6 rounded-xl border border-slate-200 p-6" role="status">
          <RefreshWhileReading />
          <p className="font-medium">We&apos;re reading your document…</p>
          <p className="mt-1 text-sm text-slate-600">
            This usually takes under a minute. You can leave this page; we&apos;ll keep going.
          </p>
          {canRetryReading(document, new Date()) && (
            <RetryReadingButton documentId={document.id} label="Taking too long? Read it again" />
          )}
        </section>
      )}

      {document.status === "failed" && (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-800">We couldn&apos;t read this document just now.</p>
          <p className="mt-1 text-sm text-red-700">
            This is usually a temporary problem on our side. Your file is saved.
          </p>
          <RetryReadingButton documentId={document.id} label="Try again" />
        </section>
      )}

      {document.status === "needs_review" && (
        <section className="mt-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">Please check what we read</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-red-900">
              {validateExtraction(extracted).problems.map((problem) => (
                <li key={describeProblem(problem)}>{describeProblem(problem)}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-red-900">
              {lines.length > 0
                ? "Compare what's below with your paper document and fix anything that's off, or "
                : "Type the details from your paper document below, or "}
              <Link href="/upload" className="font-medium underline">
                upload a clearer copy
              </Link>
              .
            </p>
          </div>
          <ReviewForm
            action={saveReview.bind(null, document.id)}
            initialDetails={{
              type: document.type ?? "bill",
              provider_name: document.provider_name ?? "",
              patient_name: document.patient_name ?? "",
              service_date: document.service_date ?? "",
              insurance_paid: amountForInput(document.insurance_paid_cents),
              patient_responsibility: amountForInput(document.patient_responsibility_cents),
            }}
            initialLines={lines.map((line) => ({
              code: line.code ?? "",
              description: line.description ?? "",
              service_date: line.service_date ?? "",
              amount: formatCentsForInput(line.amount_cents),
              quantity: line.quantity,
            }))}
            initialTotal={amountForInput(document.stated_total_cents)}
          />
        </section>
      )}

      {document.status === "parsed" && (
        <section className="mt-6">
          <DetailList
            details={[
              ["Patient", document.patient_name],
              ["Insurer", extracted?.insurer_name],
              ["Issued", extracted?.issued_date && formatServiceDate(extracted.issued_date)],
              ["Claim number", extracted?.claim_number],
              ["Account number", extracted?.account_number],
            ]}
          />

          <h2 className="mt-8 font-semibold">Charges</h2>
          <LineItemsList lines={lines} />

          <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt>Total charges</dt>
              <dd className="tabular-nums">{amountOrNotStated(document.stated_total_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Paid by insurance</dt>
              <dd className="tabular-nums">{amountOrNotStated(document.insurance_paid_cents)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
              <dt>You owe, per this document</dt>
              <dd className="tabular-nums">{amountOrNotStated(document.patient_responsibility_cents)}</dd>
            </div>
          </dl>

          {document.visit_id ? (
            <Link
              href={`/visits/${document.visit_id}`}
              className="mt-8 inline-block rounded-lg bg-[var(--rc-accent)] px-4 py-2 font-medium text-[var(--rc-navy)]"
            >
              See the whole visit
            </Link>
          ) : (
            <p className="mt-8 text-sm text-slate-600">
              We couldn&apos;t tell which visit this belongs to, because the provider or the date
              of service is missing.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function DetailList({ details }: { details: [string, string | null | undefined][] }) {
  const shown = details.filter((detail): detail is [string, string] => Boolean(detail[1]));
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt className="text-slate-500">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
