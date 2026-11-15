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
import { LOCALE_TAGS } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { preventiveChecklist, preventiveProfileOf } from "@/lib/preventive/schedule";
import { aboutYouDefaults, estimateDetailsKnown, insuranceToInput } from "@/lib/profile/onboarding";

const updatedFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

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
  const preventiveText = { preventiveForm: t.preventiveForm, preventiveServices: t.preventiveServices, preventiveMethods: t.preventiveMethods };
  const details = estimateDetailsKnown(insurance);
  const paid = profile?.plan === "paid";
  const money = (cents: number | null | undefined) => (cents == null ? null : formatCents(cents));
  const coinsurance = insuranceToInput(insurance).coinsurance;
  const copays = [
    [insurance?.copay_primary_cents, "primary care"],
    [insurance?.copay_specialist_cents, "specialist"],
    [insurance?.copay_urgent_care_cents, "urgent care"],
    [insurance?.copay_er_cents, "ER"],
  ]
    .filter(([cents]) => cents != null)
    .map(([cents, label]) => `${formatCents(cents as number)} ${label}`);
  const chips = [insurance?.insurer_name, insurance?.plan_name, insurance?.plan_type === "other" ? null : insurance?.plan_type]
    .filter((chip): chip is string => Boolean(chip));

  return (
    <>
      <h1>Your profile</h1>
      {params.saved === "1" && (
        <p role="status" className="mt-4 rounded-xl bg-[var(--rc-navy)]/4 p-4 text-sm">
          Saved. New estimates will use these details.
        </p>
      )}

      <section aria-label="Profile summary" className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--rc-navy)] p-5 text-[var(--rc-ivory)]">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--rc-accent)] text-lg font-medium text-[var(--rc-navy)]">
          {initials(profile?.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{profile?.full_name || "Your name"}</p>
          <p className="text-sm text-[var(--rc-ivory)]/75">
            {[profile?.zip_code && `ZIP ${profile.zip_code}`, profile?.household_size && `${profile.household_size} in household`]
              .filter(Boolean)
              .join(" · ") || "Add your ZIP to find care nearby"}
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-[var(--rc-ivory)]/65">Plan</dt>
            <dd className="mt-0.5 font-medium">{paid ? PAID_PLAN_NAME : "Free"}</dd>
          </div>
          <div>
            <dt className="text-[var(--rc-ivory)]/65">Insurance details</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{details.known} of {details.total}</dd>
          </div>
        </dl>
      </section>

      <ProfileStack
        defaultOpen={params.open === "preventive" ? ["preventive"] : details.known === 0 ? ["insurance"] : []}
        sections={[
          {
            id: "about",
            label: "About you",
            title: "About you",
            summary: (
              <Rows
                rows={[
                  ["Name", profile?.full_name || null],
                  ["ZIP code", profile?.zip_code || null],
                  ["Household", profile?.household_size ? String(profile.household_size) : null],
                  ["Birth year", profile?.birth_year ? String(profile.birth_year) : null],
                  ["Sex", profile?.sex ? (profile.sex === "female" ? "Female" : "Male") : null],
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
            label: "Insurance",
            title: `Your ${year} insurance`,
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
                  rows={[
                    ["Deductible", money(insurance?.deductible_cents) && `${money(insurance?.deductible_cents)}${insurance?.deductible_met_cents != null ? ` · ${money(insurance.deductible_met_cents)} paid` : ""}`],
                    ["Out-of-pocket max", money(insurance?.oop_max_cents) && `${money(insurance?.oop_max_cents)}${insurance?.oop_met_cents != null ? ` · ${money(insurance.oop_met_cents)} spent` : ""}`],
                    ["Coinsurance", coinsurance ? `${coinsurance}%` : null],
                    ["Copays", copays.length ? copays.join(" · ") : null],
                  ]}
                />
                <p className="mt-3 text-xs text-[var(--rc-muted)]">
                  {details.known} of {details.total} details that shape your cost estimates
                  {insurance?.updated_at ? ` · updated ${updatedFormat.format(new Date(insurance.updated_at))}` : ""}
                </p>
              </>
            ),
            editor: (
              <InsuranceProfileForm
                action={saveInsuranceAction}
                next="/profile?saved=1"
                submitLabel="Save insurance details"
                t={t.insuranceForm}
                savingLabel={t.common.saving}
                defaults={insuranceToInput(insurance)}
              />
            ),
          },
          {
            id: "preventive",
            label: "Preventive care",
            title: "Free preventive care",
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
                <p className="mt-3 text-xs text-[var(--rc-muted)]">{t.preventiveForm.coverage}</p>
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
          <h2 id="plan-title" className="font-medium">Your plan</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={`size-2 rounded-full ${paid ? "bg-green-600" : "bg-[var(--rc-navy)]/30"}`} />
            {paid ? `${PAID_PLAN_NAME} · ${formatCents(MONTHLY_PRICE_CENTS)} a month` : "Free: your first care question and first bill check"}
          </p>
        </div>
        <Link href="/billing" className="rounded-full bg-[var(--rc-navy)] px-4 py-2 text-sm text-[var(--rc-ivory)] transition-colors hover:bg-[var(--rc-navy)]/85">
          {paid ? "Manage plan" : `Upgrade to ${PAID_PLAN_NAME}`}
        </Link>
      </section>
    </>
  );
}

function initials(name: string | null | undefined): string {
  const letters = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase());
  return letters.join("") || "R";
}

function Rows({ rows }: { rows: [string, string | null | undefined | ""][] }) {
  return (
    <dl className="text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 border-t border-[var(--rc-navy)]/10 py-2 first:border-t-0">
          <dt className="text-[var(--rc-muted)]">{label}</dt>
          <dd className={value ? "tabular-nums" : "text-[var(--rc-muted)]"}>{value || "Not added"}</dd>
        </div>
      ))}
    </dl>
  );
}
