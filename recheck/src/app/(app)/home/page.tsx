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
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill, LOCALE_TAGS } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";

const RECENT_CASES = 5;
const RECENT_VISITS = 3;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const { locale, t } = await getT();
  const h = t.home;
  const date = (iso: string) => formatServiceDate(iso, LOCALE_TAGS[locale]);
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
        {profile?.full_name ? fill(h.greeting, { name: profile.full_name }) : h.welcome}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{h.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--rc-muted)]">
        {h.intro}
      </p>
      <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
        {h.emergencyBefore}{" "}
        <a href="tel:911" className="font-semibold underline">{h.call911}</a> {h.emergencyAfter}
      </p>
      <CareDescriptionForm t={t.careForm} />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--rc-navy)]/15 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{fill(h.insuranceTitle, { year })}</h2>
            <Link href="/profile" className="text-sm underline underline-offset-4">{h.edit}</Link>
          </div>
          <p className="mt-1 text-sm text-[var(--rc-muted)]">{planLine || h.noPlan}</p>
          {summary.deductible && <ProgressBar label={h.deductible} progress={summary.deductible} of={h.of} />}
          {summary.outOfPocket && <ProgressBar label={h.oopMax} progress={summary.outOfPocket} of={h.of} />}
          {summary.deductible || summary.outOfPocket ? (
            <p className="mt-3 text-xs text-[var(--rc-muted)]">
              {h.insuranceNote}
            </p>
          ) : (
            <p className="mt-3 text-sm">
              <Link href="/profile" className="font-medium underline">{h.addDeductible}</Link>{" "}
              {h.addDeductibleAfter}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[var(--rc-navy)]/15 p-5">
          <h2 className="font-semibold">{h.savingsTitle}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--rc-navy)]/4 p-4">
              <dt className="text-xs text-[var(--rc-navy)]/70">{h.savedFromCare}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCents(estimatedCareSavingsCents(cases))}</dd>
            </div>
            <div className="rounded-xl bg-[var(--rc-navy)]/4 p-4">
              <dt className="text-xs text-[var(--rc-navy)]/70">{h.worthAsking}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCents(summary.savingsFoundCents)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--rc-muted)]">
            {fill(h.savingsNote, { year })}
          </p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm underline underline-offset-4">{h.yearDetail}</Link>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{h.casesTitle}</h2>
          <Link href="/care/new" className="text-sm underline underline-offset-4">{h.askNew}</Link>
        </div>
        {cases.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[var(--rc-navy)]/4 p-5 text-sm">
            {h.noCases}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 overflow-hidden rounded-lg border border-[var(--rc-navy)]/15">
            {cases.slice(0, RECENT_CASES).map((careCase) => (
              <li key={careCase.id}>
                <Link href={`/care/${careCase.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--rc-navy)]/4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{careCase.summary ?? careCase.description}</span>
                    <span className="text-sm text-[var(--rc-navy)]/70">
                      {date(careCase.created_at.slice(0, 10))} · {caseStatus(careCase, h)}
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
          <h2 className="font-semibold">{h.billsTitle}</h2>
          <Link href="/upload" className="text-sm underline underline-offset-4">{h.addBill}</Link>
        </div>
        {visits.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[var(--rc-navy)]/4 p-5 text-sm">
            {h.noBillsBefore} <Link href="/upload" className="font-medium underline">{h.noBillsLink}</Link>{" "}
            {h.noBillsAfter}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 overflow-hidden rounded-lg border border-[var(--rc-navy)]/15">
            {visits.slice(0, RECENT_VISITS).map((visit) => (
              <li key={visit.id}>
                <Link href={`/visits/${visit.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--rc-navy)]/4">
                  <span className="min-w-0">
                    <span className="block break-words font-medium">{visit.provider_name}</span>
                    <span className="text-sm text-[var(--rc-navy)]/70">
                      {date(visit.service_date)} · {t.visitStatus[visit.status]}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCents(visit.patient_owes_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {visits.length > RECENT_VISITS && (
          <Link href="/visits" className="mt-3 inline-block text-sm underline underline-offset-4">{h.allBills}</Link>
        )}
      </section>
    </>
  );
}

function caseStatus(careCase: CareCase, h: Dictionary["home"]): string {
  if (careCase.urgency === "emergency" || careCase.urgency === "urgent") return h.caseGetCare;
  if (!careCase.urgency) return h.caseSafety;
  const chosen = chosenProviderSchema.safeParse(careCase.chosen_provider);
  return chosen.success ? fill(h.caseChose, { name: chosen.data.name }) : h.caseCompare;
}
