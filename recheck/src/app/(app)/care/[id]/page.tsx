import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CareSafetyForm } from "@/components/CareSafetyForm";
import { CareSafetyNotice } from "@/components/CareSafetyNotice";
import { CostForecast } from "@/components/CostForecast";
import { CARE_ROUTES } from "@/lib/care/routes";
import { assessUrgency } from "@/lib/care/safety";
import { insuranceToCostPlan } from "@/lib/care/profile";
import { forecastScenarios } from "@/lib/costs/scenarios";
import { getCurrentUser } from "@/lib/db/auth";
import { getCareCase } from "@/lib/db/care";
import { getInsurancePlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { readCaseContext } from "@/lib/schemas/intake";

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
  const editingSafety = !assessment || assessment.urgency !== "routine" || (await searchParams).safety === "1";
  const showOptions = !editingSafety && assessment?.urgency === "routine" && context.scope === "knee_leg";
  const insurance = showOptions ? await getInsurancePlan(db, user.id, new Date().getUTCFullYear()) : null;

  return (
    <>
      <Link href="/care/new" className="text-sm underline underline-offset-4">Ask another care question</Link>
      <h1 className="mt-4">Your care question</h1>
      {assessment && <CareSafetyNotice assessment={assessment} />}
      <section className="mt-5 rounded-xl bg-[var(--rc-navy)]/4 p-5">
        <h2 className="font-semibold">{context.intake ? "What we understood" : "What you told us"}</h2>
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
          <section className="mt-6 rounded-xl border border-[var(--rc-navy)]/20 p-5"><h2 className="font-semibold">This question needs a different kind of guidance</h2><p className="mt-2 text-sm">Our current safety questions and cost scenarios cover knee or leg pain only. Contact your primary care clinician or your insurer&apos;s nurse line about other symptoms. These answers cannot rule out an emergency.</p></section>
        )}
        {showOptions && <>
          <h2 className="mt-8 text-xl font-semibold">Compare ways to get care</h2>
          <p className="mt-2 text-sm text-[var(--rc-muted)]">You haven&apos;t reported a warning sign in this check. This doesn&apos;t rule out every problem. Contact a clinician if you&apos;re worried or your symptoms change.</p>
          {([CARE_ROUTES.primary_care, CARE_ROUTES.sports_medicine, CARE_ROUTES.urgent_care]).map((route) => (
            <section key={route.id} className="mt-6 rounded-xl border border-[var(--rc-navy)]/20 p-5">
              <h2 className="text-lg font-semibold">{route.label}</h2>
              <p className="mt-2 text-sm leading-relaxed">{route.forWhat}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--rc-muted)]">{route.accessNotes.map((note) => <li key={note}>{note}</li>)}</ul>
              <CostForecast scenarios={forecastScenarios(route, insuranceToCostPlan(insurance))} />
            </section>
          ))}
          <p className="mt-5 text-sm">Missing insurance details? <Link href="/profile" className="font-medium underline">Update your profile</Link> to narrow the estimates.</p>
        </>}
      </div>
    </>
  );
}
