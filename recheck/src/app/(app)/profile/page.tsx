import { redirect } from "next/navigation";
import { saveAboutYouAction, saveInsuranceAction } from "@/app/(onboarding)/onboarding/actions";
import { AboutYouForm } from "@/components/AboutYouForm";
import { InsuranceProfileForm } from "@/components/InsuranceProfileForm";
import { getCurrentUser } from "@/lib/db/auth";
import { getInsurancePlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { insuranceToInput } from "@/lib/profile/onboarding";
import { getT } from "@/lib/i18n/server";

const updatedFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const year = new Date().getUTCFullYear();
  const { t } = await getT();
  const [profile, insurance, params] = await Promise.all([
    getProfile(supabase, user.id),
    getInsurancePlan(supabase, user.id, year),
    searchParams,
  ]);

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Your profile
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your details and insurance</h1>
      {params.saved === "1" && (
        <p role="status" className="mt-4 rounded-xl bg-[var(--rc-navy)]/4 p-4 text-sm">
          Saved. New estimates will use these details.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">About you</h2>
        <AboutYouForm
          action={saveAboutYouAction}
          next="/profile?saved=1"
          submitLabel={t.common.save}
          t={t.aboutForm}
          savingLabel={t.common.saving}
          defaults={{
            fullName: profile?.full_name ?? "",
            zipCode: profile?.zip_code ?? "",
            householdSize: profile?.household_size == null ? "" : String(profile.household_size),
          }}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">Your {year} insurance</h2>
        {insurance?.updated_at && (
          <p className="mt-1 text-xs text-[var(--rc-navy)]/60">
            Last updated {updatedFormat.format(new Date(insurance.updated_at))}
          </p>
        )}
        <InsuranceProfileForm
          action={saveInsuranceAction}
          next="/profile?saved=1"
          submitLabel="Save insurance details"
          t={t.insuranceForm}
          savingLabel={t.common.saving}
          defaults={insuranceToInput(insurance)}
        />
      </section>
    </>
  );
}
