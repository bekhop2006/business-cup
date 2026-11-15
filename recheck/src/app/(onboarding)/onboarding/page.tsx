import { redirect } from "next/navigation";
import { AboutYouForm } from "@/components/AboutYouForm";
import { InsuranceProfileForm } from "@/components/InsuranceProfileForm";
import { getCurrentUser } from "@/lib/db/auth";
import { getInsurancePlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { formatCents } from "@/lib/money";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { estimateDetailsKnown, insuranceToInput } from "@/lib/profile/onboarding";
import { finishOnboardingAction, saveAboutYouAction, saveInsuranceAction } from "./actions";

const STEPS = ["about", "insurance", "done"] as const;
type Step = (typeof STEPS)[number];

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const requested = (await searchParams).step;
  const step: Step = STEPS.find((name) => name === requested) ?? "about";

  const supabase = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const { t } = await getT();
  const o = t.onboarding;
  const [profile, insurance] = await Promise.all([
    getProfile(supabase, user.id),
    getInsurancePlan(supabase, user.id, year),
  ]);

  return (
    <>
      <p className="text-sm text-[var(--rc-muted)]">
        {fill(o.step, { n: STEPS.indexOf(step) + 1, total: STEPS.length })}
      </p>

      {step === "about" && (
        <>
          <h1 className="mt-3">{o.aboutTitle}</h1>
          <p className="mt-2 text-[var(--rc-navy)]/70">{o.aboutIntro}</p>
          <AboutYouForm
            action={saveAboutYouAction}
            next="/onboarding?step=insurance"
            submitLabel={t.common.continue}
            t={t.aboutForm}
            savingLabel={t.common.saving}
            defaults={{
              fullName: profile?.full_name ?? "",
              zipCode: profile?.zip_code ?? "",
              householdSize: profile?.household_size == null ? "" : String(profile.household_size),
            }}
          />
        </>
      )}

      {step === "insurance" && (
        <>
          <h1 className="mt-3">{o.insuranceTitle}</h1>
          <InsuranceProfileForm
            action={saveInsuranceAction}
            next="/onboarding?step=done"
            submitLabel={t.common.continue}
            t={t.insuranceForm}
            savingLabel={t.common.saving}
            defaults={insuranceToInput(insurance)}
          />
        </>
      )}

      {step === "done" && <Summary profile={profile} insurance={insurance} t={t} />}

      {step !== "done" && (
        <form action={finishOnboardingAction} className="mt-6">
          <button className="text-sm text-[var(--rc-navy)]/70 underline underline-offset-4">
            {o.skip}
          </button>
        </form>
      )}
    </>
  );
}

function Summary({
  profile,
  insurance,
  t,
}: {
  profile: Awaited<ReturnType<typeof getProfile>>;
  insurance: Awaited<ReturnType<typeof getInsurancePlan>>;
  t: Dictionary;
}) {
  const o = t.onboarding;
  const none = t.common.notAdded;
  const details = estimateDetailsKnown(insurance);
  const amount = (cents: number | null | undefined) => (cents == null ? none : formatCents(cents));
  const rows: [string, string][] = [
    [o.name, profile?.full_name ?? none],
    [o.zip, profile?.zip_code ?? none],
    [o.insurance, [insurance?.insurer_name, insurance?.plan_name, insurance?.plan_type].filter(Boolean).join(" · ") || none],
    [o.deductible, insurance?.deductible_cents == null ? none : `${amount(insurance.deductible_cents)} (${fill(o.paidSoFar, { amount: amount(insurance.deductible_met_cents) })})`],
    [o.oopMax, insurance?.oop_max_cents == null ? none : `${amount(insurance.oop_max_cents)} (${fill(o.spentSoFar, { amount: amount(insurance.oop_met_cents) })})`],
    [o.coinsurance, insurance?.coinsurance_bps == null ? none : `${insurance.coinsurance_bps / 100}%`],
    [o.copays, [
      [o.copayPrimary, insurance?.copay_primary_cents],
      [o.copaySpecialist, insurance?.copay_specialist_cents],
      [o.copayUrgentCare, insurance?.copay_urgent_care_cents],
      [o.copayEr, insurance?.copay_er_cents],
    ].filter(([, cents]) => cents != null).map(([label, cents]) => `${formatCents(cents as number)} ${label}`).join(" · ") || none],
  ];

  return (
    <>
      <h1 className="mt-3">{o.summaryTitle}</h1>
      <dl className="mt-6 divide-y divide-[var(--rc-navy)]/10 rounded-xl border border-[var(--rc-navy)]/15">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between">
            <dt className="text-sm text-[var(--rc-navy)]/70">{label}</dt>
            <dd className="font-medium sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-[var(--rc-navy)]/75">
        {fill(o.detailsKnown, { known: details.known, total: details.total })}{" "}
        {details.known < details.total ? o.detailsMissing : o.detailsComplete}
      </p>
      <form action={finishOnboardingAction} className="mt-6">
        <button className="rounded-lg bg-[var(--rc-accent)] px-5 py-2 font-medium text-[var(--rc-navy)]">
          {o.goToDashboard}
        </button>
      </form>
    </>
  );
}
