import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CareSafetyForm } from "@/components/CareSafetyForm";
import { CareSafetyNotice } from "@/components/CareSafetyNotice";
import { CostForecast } from "@/components/CostForecast";
import { CaseProviders } from "@/components/CaseProviders";
import { CareChoice } from "@/components/CareChoice";
import { Paywall } from "@/components/Paywall";
import { canCompareCareOptions } from "@/lib/billing/plan";
import { CARE_ROUTES, COMPARISON_ROUTE_IDS } from "@/lib/care/routes";
import { assessUrgency } from "@/lib/care/safety";
import { insuranceToCostPlan } from "@/lib/care/profile";
import { forecastScenarios } from "@/lib/costs/scenarios";
import { getCurrentUser } from "@/lib/db/auth";
import { getCareCase, getFirstCareCaseId, listCaseProviders } from "@/lib/db/care";
import { getInsurancePlan, getPlan, getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { readCaseContext } from "@/lib/schemas/intake";
import { chosenProviderSchema, comparisonRouteSchema } from "@/lib/schemas/providers";

export default async function CareCasePage({ params, searchParams }: PageProps<"/care/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await createServerSupabase();
  const careCase = await getCareCase(db, user.id, id);
  if (!careCase) notFound();
  const context = readCaseContext(careCase.warning_answers);
  const assessment = context.answers ? assessUrgency(context.answers) : null;
  const query = await searchParams;
  const editingSafety = !assessment || assessment.urgency !== "routine" || query.safety === "1";
  const routineKnee = !editingSafety && assessment?.urgency === "routine" && context.scope === "knee_leg";
  // Safety answers and warnings are always free; the options after them are not.
  const showOptions = routineKnee && canCompareCareOptions(
    await getPlan(db, user.id), id, await getFirstCareCaseId(db, user.id),
  );
  const insurance = showOptions ? await getInsurancePlan(db, user.id, new Date().getUTCFullYear()) : null;
  const profile = showOptions ? await getProfile(db, user.id) : null;
  const selected = comparisonRouteSchema.safeParse(query.route ?? careCase.route);
  const selectedRoute = showOptions && selected.success ? selected.data : null;
  const search = selectedRoute ? context.provider_searches?.[selectedRoute] : undefined;
  const providers = selectedRoute && search?.status === "found"
    ? await listCaseProviders(db, user.id, id, selectedRoute, search.provider_ids) : [];
  const chosen = chosenProviderSchema.safeParse(careCase.chosen_provider);

  return (
    <>
      <Link href="/care/new" className="text-sm underline underline-offset-4">Ask another care question</Link>
      <h1 className="mt-4">Your care question</h1>
      {assessment && <CareSafetyNotice assessment={assessment} />}
      <section className="mt-5 rounded-xl bg-[var(--rc-navy)]/4 p-5">
        <h2 className="font-medium">{context.intake ? "What we understood" : "What you told us"}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{careCase.summary ?? careCase.description}</p>
        {context.intake && <details className="mt-3 text-sm"><summary className="cursor-pointer py-2">Your original description</summary><p className="mt-2 whitespace-pre-wrap">{careCase.description}</p></details>}
        {!context.intake && <p role="status" className="mt-3 text-xs text-[var(--rc-muted)]">AI summary skipped or unavailable. You can still answer the safety questions and compare costs.</p>}
      </section>
      {editingSafety ? (
        <CareSafetyForm key={`${id}-${careCase.urgency}`} caseId={id} defaults={context.answers ?? {}} mentioned={context.intake?.mentioned_warning_signs ?? []} scope={context.scope} />
      ) : (
        <Link href={`/care/${id}?safety=1`} className="mt-5 inline-block min-h-11 py-3 text-sm font-medium underline">Review or change your safety answers</Link>
      )}
      <div id="next-steps" className="scroll-mt-6">
        {assessment?.urgency === "routine" && context.scope !== "knee_leg" && (
          <section className="mt-6 rounded-xl border border-[var(--rc-navy)]/20 p-5"><h2 className="font-medium">This question needs a different kind of guidance</h2><p className="mt-2 text-sm">Our current safety questions and cost scenarios cover knee or leg pain only. Contact your primary care clinician or your insurer&apos;s nurse line about other symptoms. These answers cannot rule out an emergency.</p></section>
        )}
        {routineKnee && !showOptions && (
          <Paywall title="Compare care options, costs and providers">
            You haven&apos;t reported a warning sign in this check. Your first care question included
            care options, cost forecasts for your plan and nearby providers. Upgrade to get them for
            this question too.
          </Paywall>
        )}
        {showOptions && <>
          <CareChoice
            providerValue={careCase.chosen_provider}
            estimateValue={careCase.estimate}
            appointment={{
              caseId: id,
              at: careCase.appointment_at,
              status: careCase.appointment_status,
              name: profile?.full_name ?? null,
              insurance: [insurance?.insurer_name, insurance?.plan_name].filter(Boolean).join(" ") || null,
            }}
          />
          <h2 className="mt-8 text-xl font-medium">Compare ways to get care</h2>
          <p className="mt-2 text-sm text-[var(--rc-muted)]">You haven&apos;t reported a warning sign in this check. This doesn&apos;t rule out every problem. Contact a clinician if you&apos;re worried or your symptoms change.</p>
          {COMPARISON_ROUTE_IDS.map((routeId) => CARE_ROUTES[routeId]).map((route) => (
            <section key={route.id} className="mt-6 rounded-xl border border-[var(--rc-navy)]/20 p-5">
              <h2 className="text-lg font-medium">{route.label}</h2>
              <p className="mt-2 text-sm leading-relaxed">{route.forWhat}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--rc-muted)]">{route.accessNotes.map((note) => <li key={note}>{note}</li>)}</ul>
              <CostForecast scenarios={forecastScenarios(route, insuranceToCostPlan(insurance))} />
              <Link href={`/care/${id}?route=${route.id}#providers`} aria-label={`Find ${route.label.toLowerCase()} providers`} className="mt-4 inline-block min-h-11 rounded-lg border border-[var(--rc-navy)]/25 px-4 py-3 text-sm font-medium hover:bg-[var(--rc-navy)]/5">Find providers for this option</Link>
            </section>
          ))}
          <p className="mt-5 text-sm">Missing insurance details? <Link href="/profile" className="font-medium underline">Update your profile</Link> to narrow the estimates.</p>
          {selectedRoute && <CaseProviders caseId={id} route={selectedRoute} zip={profile?.zip_code ?? ""} search={search} providers={providers} chosenId={chosen.success ? chosen.data.id : undefined} />}
        </>}
      </div>
    </>
  );
}
