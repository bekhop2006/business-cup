import Link from "next/link";
import { redirect } from "next/navigation";
import { CareDescriptionForm } from "@/components/CareDescriptionForm";
import { ProgressBar } from "@/components/ProgressBar";
import { estimatedCareSavingsCents } from "@/lib/dashboard/home";
import { summarizeYear } from "@/lib/dashboard/yearly";
import { getCurrentUser } from "@/lib/db/auth";
import { listCareCases, type CareCase } from "@/lib/db/care";
import { listReadEobs } from "@/lib/db/documents";
import { listUserFlags } from "@/lib/db/flags";
import { getInsurancePlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { listVisits } from "@/lib/db/visits";
import { formatServiceDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { chosenProviderSchema } from "@/lib/schemas/providers";
import { VISIT_STATUS_LABELS } from "@/lib/visits/totals";

const RECENT_CASES = 5;
const RECENT_VISITS = 3;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const [profile, insurance, cases, visits, eobs, flags] = await Promise.all([
    getProfile(db, user.id),
    getInsurancePlan(db, user.id, year),
    listCareCases(db, user.id),
    listVisits(db, user.id),
    listReadEobs(db, user.id),
    listUserFlags(db, user.id),
  ]);
  const newestEob = (visitId: string) =>
    eobs
      .filter((eob) => eob.visit_id === visitId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const summary = summarizeYear(
    year,
    visits.map((visit) => ({
      ...visit,
      eob_patient_responsibility_cents: newestEob(visit.id)?.patient_responsibility_cents ?? null,
      flags: flags.filter((flag) => flag.visit_id === visit.id),
    })),
    insurance,
  );
  const planLine = [insurance?.insurer_name, insurance?.plan_name, insurance?.plan_type]
    .filter((part) => part && part !== "other")
    .join(" · ");

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        {profile?.full_name ? `Hi, ${profile.full_name}` : "Welcome back"}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">What&apos;s going on? How can we help?</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--rc-muted)]">
        Describe a health problem to see where to go, who&apos;s nearby and what you might pay. This
        version covers knee or leg pain.
      </p>
      <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
        If you have chest pain, trouble breathing, or think this is an emergency,{" "}
        <a href="tel:911" className="font-semibold underline">call 911</a> or get emergency care now.
      </p>
      <CareDescriptionForm />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--rc-navy)]/15 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Your {year} insurance</h2>
            <Link href="/profile" className="text-sm underline underline-offset-4">Edit</Link>
          </div>
          <p className="mt-1 text-sm text-[var(--rc-muted)]">{planLine || "No plan details yet."}</p>
          {summary.deductible && <ProgressBar label="Deductible" progress={summary.deductible} />}
          {summary.outOfPocket && <ProgressBar label="Out-of-pocket maximum" progress={summary.outOfPocket} />}
          {summary.deductible || summary.outOfPocket ? (
            <p className="mt-3 text-xs text-[var(--rc-muted)]">
              From what you entered and the insurer statements you&apos;ve added. Your insurer&apos;s
              website has the exact numbers.
            </p>
          ) : (
            <p className="mt-3 text-sm">
              <Link href="/profile" className="font-medium underline">Add your deductible</Link> to see
              how close you are and to narrow cost estimates.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[var(--rc-navy)]/15 p-5">
          <h2 className="font-semibold">Your savings</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--rc-navy)]/4 p-4">
              <dt className="text-xs text-[var(--rc-navy)]/70">Estimated from care choices</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCents(estimatedCareSavingsCents(cases))}</dd>
            </div>
            <div className="rounded-xl bg-[var(--rc-navy)]/4 p-4">
              <dt className="text-xs text-[var(--rc-navy)]/70">Worth asking about on bills</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCents(summary.savingsFoundCents)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--rc-muted)]">
            Care choices: the estimated difference against an urgent care visit for each provider you
            chose, not money saved yet. Bills: possible errors found in {year}, worth a question to
            your provider.
          </p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm underline underline-offset-4">See your year in detail</Link>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Your care questions</h2>
          <Link href="/care/new" className="text-sm underline underline-offset-4">Ask a new one</Link>
        </div>
        {cases.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[var(--rc-navy)]/4 p-5 text-sm">
            No care questions yet. Describe what&apos;s bothering you above to get started.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 overflow-hidden rounded-lg border border-[var(--rc-navy)]/15">
            {cases.slice(0, RECENT_CASES).map((careCase) => (
              <li key={careCase.id}>
                <Link href={`/care/${careCase.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--rc-navy)]/4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{careCase.summary ?? careCase.description}</span>
                    <span className="text-sm text-[var(--rc-navy)]/70">
                      {formatServiceDate(careCase.created_at.slice(0, 10))} · {caseStatus(careCase)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">After the visit: your bills</h2>
          <Link href="/upload" className="text-sm underline underline-offset-4">Add a bill</Link>
        </div>
        {visits.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[var(--rc-navy)]/4 p-5 text-sm">
            Got a bill or an insurance statement? <Link href="/upload" className="font-medium underline">Add it</Link>{" "}
            and we&apos;ll check it for possible errors.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 overflow-hidden rounded-lg border border-[var(--rc-navy)]/15">
            {visits.slice(0, RECENT_VISITS).map((visit) => (
              <li key={visit.id}>
                <Link href={`/visits/${visit.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--rc-navy)]/4">
                  <span className="min-w-0">
                    <span className="block break-words font-medium">{visit.provider_name}</span>
                    <span className="text-sm text-[var(--rc-navy)]/70">
                      {formatServiceDate(visit.service_date)} · {VISIT_STATUS_LABELS[visit.status]}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCents(visit.patient_owes_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {visits.length > RECENT_VISITS && (
          <Link href="/visits" className="mt-3 inline-block text-sm underline underline-offset-4">All bills</Link>
        )}
      </section>
    </>
  );
}

function caseStatus(careCase: CareCase): string {
  if (careCase.urgency === "emergency" || careCase.urgency === "urgent") return "Get care now";
  if (!careCase.urgency) return "Safety questions to answer";
  const chosen = chosenProviderSchema.safeParse(careCase.chosen_provider);
  return chosen.success ? `Chose ${chosen.data.name}` : "Compare care options";
}
