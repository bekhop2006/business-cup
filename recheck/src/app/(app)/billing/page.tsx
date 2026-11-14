import { redirect } from "next/navigation";
import { UpgradeButton } from "@/components/UpgradeButton";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { getCurrentUser } from "@/lib/db/auth";
import { getPlan } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { formatCents } from "@/lib/money";

const INCLUDED = [
  "Every visit checked for duplicate charges, bill and insurance mismatches, unclear charges and totals that don't add up",
  "A dispute letter and a phone script for each visit with something worth asking about",
  "Your yearly picture: what you've spent, your deductible and out-of-pocket progress, and what you owe now",
];

export default async function BillingPage({ searchParams }: PageProps<"/billing">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plan = await getPlan(await createServerSupabase(), user.id);
  const params = await searchParams;

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Your plan
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {plan === "paid" ? `You're on ${PAID_PLAN_NAME}` : "You're on the free plan"}
      </h1>

      {params.upgraded === "1" && (
        <p role="status" className="mt-4 rounded-xl bg-[var(--rc-navy)]/4 p-4 text-sm">
          Thank you. Your payment went through and everything is unlocked.
        </p>
      )}
      {params.canceled === "1" && plan === "free" && (
        <p role="status" className="mt-4 rounded-xl bg-[var(--rc-navy)]/4 p-4 text-sm">
          No payment was made. You can upgrade whenever you&apos;re ready.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-[var(--rc-navy)]/15 p-5">
        <h2 className="font-semibold">
          {PAID_PLAN_NAME} · {formatCents(MONTHLY_PRICE_CENTS)} a month for your whole family
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--rc-navy)]/75">
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {plan === "free" ? (
          <>
            <p className="mt-4 text-sm text-[var(--rc-navy)]/75">
              On the free plan, the check of your first visit is included.
            </p>
            <div className="mt-4">
              <UpgradeButton />
            </div>
            <p className="mt-3 text-xs text-[var(--rc-navy)]/60">
              Payments are handled by Stripe. This is a test environment: no real card is charged.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--rc-navy)]/75">Everything above is included in your plan.</p>
        )}
      </section>
    </>
  );
}
