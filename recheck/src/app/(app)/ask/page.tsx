import { redirect } from "next/navigation";
import { AskForm } from "@/components/AskForm";
import { Paywall } from "@/components/Paywall";
import { canAskQuestion } from "@/lib/billing/plan";
import { countQuestions } from "@/lib/db/ask";
import { getCurrentUser } from "@/lib/db/auth";
import { getPlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";

export default async function AskPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await createServerSupabase();
  const [plan, asked] = await Promise.all([getPlan(db, user.id), countQuestions(db, user.id)]);

  return (
    <>
      <h1>Ask Recheck</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--rc-muted)]">
        Questions about insurance, bills and free preventive care, answered only from official sources —
        HealthCare.gov, CMS, the U.S. Department of Labor and California&apos;s DMHC — with links. If they don&apos;t cover it, we say so.
        {plan === "free" && asked === 0 && " Your first question is free."}
      </p>
      {canAskQuestion(plan, asked) ? (
        <AskForm />
      ) : (
        <Paywall title="Ask more questions with Recheck Plus">
          Your free question is used. Recheck Plus answers every question from official sources.
        </Paywall>
      )}
    </>
  );
}
