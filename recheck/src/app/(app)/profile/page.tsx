import Link from "next/link";
import { redirect } from "next/navigation";
import { saveAboutYouAction, saveInsuranceAction, savePreventiveAction } from "@/app/(onboarding)/onboarding/actions";
import { AboutYouForm } from "@/components/AboutYouForm";
import { InsuranceProfileForm } from "@/components/InsuranceProfileForm";
import { PreventiveForm } from "@/components/PreventiveForm";
import { StatusBadge } from "@/components/PreventiveStatus";
import { ProfileStack } from "@/components/ProfileStack";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { getCurrentUser } from "@/lib/db/auth";
import { getPreventiveRecords } from "@/lib/db/preventive";
import { getInsurancePlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { formatCents } from "@/lib/money";
import { fill, LOCALE_TAGS } from "@/lib/i18n/locales";
import { formatServiceDate } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { preventiveChecklist, preventiveProfileOf } from "@/lib/preventive/schedule";
import { aboutYouDefaults, estimateDetailsKnown, insuranceToInput } from "@/lib/profile/onboarding";


export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const { locale, t } = await getT();
  const [profile, insurance, records, params] = await Promise.all([
    getProfile(supabase, user.id),
    getInsurancePlan(supabase, user.id, year),
    getPreventiveRecords(supabase, user.id),
    searchParams,
  ]);
  const preventive = preventiveChecklist(preventiveProfileOf(profile), records, new Date());
  const localeTag = LOCALE_TAGS[locale];
  const pr = t.profile;
  const o = t.onboarding;
  const preventiveText = { preventiveForm: t.preventiveForm, preventiveServices: t.preventiveServices, preventiveMethods: t.preventiveMethods };
  const details = estimateDetailsKnown(insurance);
  const paid = profile?.plan === "paid";
  const money = (cents: number | null | undefined) => (cents == null ? null : formatCents(cents));
  const coinsurance = insuranceToInput(insurance).coinsurance;
  const copays = [
    [insurance?.copay_primary_cents, o.copayPrimary],
    [insurance?.copay_specialist_cents, o.copaySpecialist],
    [insurance?.copay_urgent_care_cents, o.copayUrgentCare],
    [insurance?.copay_er_cents, o.copayEr],
  ]
    .filter(([cents]) => cents != null)
    .map(([cents, label]) => `${formatCents(cents as number)} ${label}`);
  const chips = [insurance?.insurer_name, insurance?.plan_name, insurance?.plan_type === "other" ? null : insurance?.plan_type]
    .filter((chip): chip is string => Boolean(chip));

  return (
    <>
      <h1>{pr.title}</h1>
      {params.saved === "1" && (
        <p role="status" className="mt-4 rounded-xl bg-[var(--rc-navy)]/4 p-4 text-sm">
          {pr.saved}
        </p>
      )}

      <section aria-label={pr.summaryLabel} className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--rc-navy)] p-5 text-[var(--rc-ivory)]">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--rc-accent)] text-lg font-medium text-[var(--rc-navy)]">
          {initials(profile?.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{profile?.full_name || pr.yourName}</p>
          <p className="text-sm text-[var(--rc-ivory)]/75">
            {[profile?.zip_code && fill(pr.zip, { zip: profile.zip_code }), profile?.household_size && fill(pr.household, { n: profile.household_size })]
              .filter(Boolean)
              .join(" · ") || pr.addZip}
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-[var(--rc-ivory)]/65">{pr.plan}</dt>
            <dd className="mt-0.5 font-medium">{paid ? PAID_PLAN_NAME : pr.free}</dd>
          </div>
          <div>
            <dt className="text-[var(--rc-ivory)]/65">{pr.insuranceDetails}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{fill(pr.knownOf, { known: details.known, total: details.total })}</dd>
          </div>
        </dl>
      </section>

      <ProfileStack
        labels={{ nav: pr.sectionsNav, edit: pr.edit, close: pr.close }}
        defaultOpen={params.open === "preventive" ? ["preventive"] : details.known === 0 ? ["insurance"] : []}
        sections={[
          {
            id: "about",
            label: pr.about,
            title: pr.about,
            summary: (
              <Rows
                notAdded={t.common.notAdded}
                rows={[
                  [pr.name, profile?.full_name || null],
                  [pr.zipCode, profile?.zip_code || null],
                  [pr.householdLabel, profile?.household_size ? String(profile.household_size) : null],
                  [pr.birthYear, profile?.birth_year ? String(profile.birth_year) : null],
                  [pr.sex, profile?.sex ? (profile.sex === "female" ? pr.female : pr.male) : null],
                ]}
              />
            ),
            editor: (
              <AboutYouForm
                action={saveAboutYouAction}
                next="/profile?saved=1"
                submitLabel={t.common.save}
                t={t.aboutForm}
                savingLabel={t.common.saving}
                defaults={aboutYouDefaults(profile)}
              />
            ),
          },
          {
            id: "insurance",
            label: pr.insurance,
            title: fill(pr.insuranceTitle, { year }),
            summary: (
              <>
                {chips.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <li key={chip} className="rounded-full bg-[var(--rc-ivory)] px-3 py-1 text-xs">{chip}</li>
                    ))}
                  </ul>
                )}
                <Rows
                  notAdded={t.common.notAdded}
                  rows={[
                    [pr.deductible, money(insurance?.deductible_cents) && `${money(insurance?.deductible_cents)}${insurance?.deductible_met_cents != null ? ` · ${fill(pr.paidAmount, { amount: money(insurance.deductible_met_cents) ?? "" })}` : ""}`],
                    [pr.oopMax, money(insurance?.oop_max_cents) && `${money(insurance?.oop_max_cents)}${insurance?.oop_met_cents != null ? ` · ${fill(pr.spentAmount, { amount: money(insurance.oop_met_cents) ?? "" })}` : ""}`],
                    [pr.coinsurance, coinsurance ? `${coinsurance}%` : null],
                    [pr.copays, copays.length ? copays.join(" · ") : null],
                  ]}
                />
                <p className="mt-3 text-xs text-[var(--rc-muted)]">
                  {fill(pr.detailsKnown, { known: details.known, total: details.total })}
                  {insurance?.updated_at ? ` · ${fill(pr.updated, { date: formatServiceDate(insurance.updated_at.slice(0, 10), localeTag) })}` : ""}
                </p>
              </>
            ),
            editor: (
              <InsuranceProfileForm
                action={saveInsuranceAction}
                next="/profile?saved=1"
                submitLabel={pr.saveInsurance}
                t={t.insuranceForm}
                savingLabel={t.common.saving}
                defaults={insuranceToInput(insurance)}
              />
            ),
          },
          {
            id: "preventive",
            label: pr.preventive,
            title: pr.preventiveTitle,
            summary: (
              <>
                <ul className="text-sm">
                  {preventive.items.map((item) => (
                    <li key={item.service.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rc-navy)]/10 py-2 first:border-t-0">
                      <span>{t.preventiveServices[item.service.id as keyof typeof t.preventiveServices]?.name ?? item.service.id}</span>
                      <StatusBadge item={item} t={preventiveText} localeTag={localeTag} />
                    </li>
                  ))}
                </ul>
              </>
            ),
            editor: (
              <PreventiveForm
                action={savePreventiveAction}
                next="/profile?saved=1"
                {...preventive}
                localeTag={localeTag}
                submitLabel={t.common.save}
                savingLabel={t.common.saving}
                t={preventiveText}
              />
            ),
          },
        ]}
      />

      <section aria-labelledby="plan-title" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--rc-navy)]/4 p-5">
        <div>
          <h2 id="plan-title" className="font-medium">{pr.yourPlan}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={`size-2 rounded-full ${paid ? "bg-green-600" : "bg-[var(--rc-navy)]/30"}`} />
            {paid ? fill(pr.paidPlanLine, { plan: PAID_PLAN_NAME, price: formatCents(MONTHLY_PRICE_CENTS) }) : pr.freePlanLine}
          </p>
        </div>
        <Link href="/billing" className="rounded-full bg-[var(--rc-navy)] px-4 py-2 text-sm text-[var(--rc-ivory)] transition-colors hover:bg-[var(--rc-navy)]/85">
          {paid ? pr.managePlan : fill(pr.upgrade, { plan: PAID_PLAN_NAME })}
        </Link>
      </section>
    </>
  );
}

function initials(name: string | null | undefined): string {
  const letters = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase());
  return letters.join("") || "R";
}

function Rows({ rows, notAdded }: { rows: [string, string | null | undefined | ""][]; notAdded: string }) {
  return (
    <dl className="text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 border-t border-[var(--rc-navy)]/10 py-2 first:border-t-0">
          <dt className="text-[var(--rc-muted)]">{label}</dt>
          <dd className={value ? "tabular-nums" : "text-[var(--rc-muted)]"}>{value || notAdded}</dd>
        </div>
      ))}
    </dl>
  );
}
