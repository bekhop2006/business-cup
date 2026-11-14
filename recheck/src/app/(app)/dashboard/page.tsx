import Link from "next/link";
import { redirect } from "next/navigation";
import { InsurancePlanForm } from "@/components/InsurancePlanForm";
import { Paywall } from "@/components/Paywall";
import { canSeeDashboard } from "@/lib/billing/plan";
import { summarizeYear, type Progress } from "@/lib/dashboard/yearly";
import { getCurrentUser } from "@/lib/db/auth";
import { listReadEobs } from "@/lib/db/documents";
import { listUserFlags } from "@/lib/db/flags";
import { getInsurancePlan, getPlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { listVisits } from "@/lib/db/visits";
import { formatCents, formatCentsForInput } from "@/lib/money";
import { saveInsurance } from "./actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const plan = await getPlan(supabase, user.id);

  if (!canSeeDashboard(plan)) {
    return (
      <>
        <Heading year={year} />
        <Paywall title="See your whole year at a glance">
          How much your family has spent on care this year, how close you are to your deductible
          and out-of-pocket maximum, what you owe right now, and how much we found worth asking
          about.
        </Paywall>
      </>
    );
  }

  const [visits, eobs, flags, insurance] = await Promise.all([
    listVisits(supabase, user.id),
    listReadEobs(supabase, user.id),
    listUserFlags(supabase, user.id),
    getInsurancePlan(supabase, user.id, year),
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

  return (
    <>
      <Heading year={year} />

      {summary.visitCount === 0 ? (
        <p className="mt-6 rounded-xl bg-[var(--rc-navy)]/4 p-5 text-sm">
          No visits from {year} yet.{" "}
          <Link href="/upload" className="font-medium underline">
            Add a bill
          </Link>{" "}
          to start your yearly picture.
        </p>
      ) : (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Your share this year" cents={summary.yourShareCents} />
          <Tile label="Owed now" cents={summary.owedNowCents} strong />
          <Tile label="Worth asking about" cents={summary.savingsFoundCents} />
          <Tile label="Billed by providers" cents={summary.billedCents} />
        </dl>
      )}
      {summary.visitCount > 0 && (
        <p className="mt-2 text-xs text-[var(--rc-navy)]/60">
          {summary.visitCount} {summary.visitCount === 1 ? "visit" : "visits"} in {year}. Your share uses
          your insurer&apos;s figure when you&apos;ve added the Explanation of Benefits, and the bill&apos;s
          otherwise.
        </p>
      )}

      <section className="mt-10 rounded-xl border border-[var(--rc-navy)]/15 p-5">
        <h2 className="font-semibold">Your {year} insurance plan</h2>
        {summary.deductible && summary.outOfPocket ? (
          <>
            <Bar label="Deductible" progress={summary.deductible} />
            <Bar label="Out-of-pocket maximum" progress={summary.outOfPocket} />
            <p className="mt-3 text-xs text-[var(--rc-navy)]/60">
              Based on the &quot;your responsibility&quot; amounts on the insurer statements you&apos;ve
              added ({formatCents(summary.confirmedByInsurerCents)} so far). Copays don&apos;t always
              count toward the deductible; your insurer&apos;s website has the exact numbers.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--rc-navy)]/75">
            Add your deductible and out-of-pocket maximum to see how close you are to them. You can
            find both on your insurance card or your insurer&apos;s website.
          </p>
        )}
        <InsurancePlanForm
          action={saveInsurance}
          year={year}
          deductible={insurance ? formatCentsForInput(insurance.deductible_cents) : ""}
          oopMax={insurance ? formatCentsForInput(insurance.oop_max_cents) : ""}
        />
      </section>
    </>
  );
}

function Heading({ year }: { year: number }) {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Your {year} picture
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your family&apos;s year in medical bills</h1>
    </>
  );
}

function Tile({ label, cents, strong = false }: { label: string; cents: number; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${strong ? "bg-[var(--rc-navy)] text-[var(--rc-ivory)]" : "bg-[var(--rc-navy)]/4"}`}>
      <dt className={`text-xs sm:text-sm ${strong ? "text-[var(--rc-ivory)]/75" : "text-[var(--rc-navy)]/70"}`}>{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{formatCents(cents)}</dd>
    </div>
  );
}

function Bar({ label, progress }: { label: string; progress: Progress }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {formatCents(progress.usedCents)} of {formatCents(progress.limitCents)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--rc-navy)]/10"
      >
        <div className="h-full rounded-full bg-[var(--rc-navy)]" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}
