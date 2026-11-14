import { redirect } from "next/navigation";
import { AboutYouForm } from "@/components/AboutYouForm";
import { InsuranceProfileForm } from "@/components/InsuranceProfileForm";
import { getCurrentUser } from "@/lib/db/auth";
import { getInsurancePlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { formatCents } from "@/lib/money";
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
  const [profile, insurance] = await Promise.all([
    getProfile(supabase, user.id),
    getInsurancePlan(supabase, user.id, year),
  ]);

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Step {STEPS.indexOf(step) + 1} of 3
      </p>

      {step === "about" && (
        <>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Let&apos;s set up your profile</h1>
          <p className="mt-2 text-[var(--rc-navy)]/70">
            Two short steps, then Recheck can tell you where to go for care and what you might pay.
          </p>
          <AboutYouForm
            action={saveAboutYouAction}
            next="/onboarding?step=insurance"
            submitLabel="Continue"
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
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your insurance</h1>
          <InsuranceProfileForm
            action={saveInsuranceAction}
            next="/onboarding?step=done"
            submitLabel="Continue"
            defaults={insuranceToInput(insurance)}
          />
        </>
      )}

      {step === "done" && <Summary profile={profile} insurance={insurance} />}

      {step !== "done" && (
        <form action={finishOnboardingAction} className="mt-6">
          <button className="text-sm text-[var(--rc-navy)]/70 underline underline-offset-4">
            Skip for now — I&apos;ll add this later
          </button>
        </form>
      )}
    </>
  );
}

function Summary({
  profile,
  insurance,
}: {
  profile: Awaited<ReturnType<typeof getProfile>>;
  insurance: Awaited<ReturnType<typeof getInsurancePlan>>;
}) {
  const details = estimateDetailsKnown(insurance);
  const amount = (cents: number | null | undefined) => (cents == null ? "Not added" : formatCents(cents));
  const rows: [string, string][] = [
    ["Name", profile?.full_name ?? "Not added"],
    ["ZIP code", profile?.zip_code ?? "Not added"],
    ["Insurance", [insurance?.insurer_name, insurance?.plan_name, insurance?.plan_type].filter(Boolean).join(" · ") || "Not added"],
    ["Deductible", insurance?.deductible_cents == null ? "Not added" : `${amount(insurance.deductible_cents)} (${amount(insurance.deductible_met_cents)} paid so far)`],
    ["Out-of-pocket maximum", insurance?.oop_max_cents == null ? "Not added" : `${amount(insurance.oop_max_cents)} (${amount(insurance.oop_met_cents)} spent so far)`],
    ["Coinsurance", insurance?.coinsurance_bps == null ? "Not added" : `${insurance.coinsurance_bps / 100}%`],
    ["Copays", [
      ["primary care", insurance?.copay_primary_cents],
      ["specialist", insurance?.copay_specialist_cents],
      ["urgent care", insurance?.copay_urgent_care_cents],
      ["ER", insurance?.copay_er_cents],
    ].filter(([, cents]) => cents != null).map(([label, cents]) => `${formatCents(cents as number)} ${label}`).join(" · ") || "Not added"],
  ];

  return (
    <>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">This is what we&apos;ll use</h1>
      <dl className="mt-6 divide-y divide-[var(--rc-navy)]/10 rounded-xl border border-[var(--rc-navy)]/15">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between">
            <dt className="text-sm text-[var(--rc-navy)]/70">{label}</dt>
            <dd className="font-medium sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-[var(--rc-navy)]/75">
        {details.known} of {details.total} details that shape your cost estimates.{" "}
        {details.known < details.total
          ? "Estimates will show a wider range until you add the rest — you can do that anytime on your profile."
          : "Your estimates will be as precise as public prices allow."}
      </p>
      <form action={finishOnboardingAction} className="mt-6">
        <button className="rounded-lg bg-[var(--rc-accent)] px-5 py-2 font-medium text-[var(--rc-navy)]">
          Go to my dashboard
        </button>
      </form>
    </>
  );
}
