import { UpgradeButton } from "@/components/UpgradeButton";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { formatCents } from "@/lib/money";

export function Paywall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-[var(--rc-navy)]/15 bg-[var(--rc-navy)]/4 p-5">
      <p className="text-sm text-[var(--rc-muted)]">
        {PAID_PLAN_NAME} · {formatCents(MONTHLY_PRICE_CENTS)} a month
      </p>
      <h2 className="mt-2 font-medium">{title}</h2>
      <div className="mt-1 text-sm text-[var(--rc-navy)]/75">{children}</div>
      <div className="mt-4">
        <UpgradeButton />
      </div>
      <p className="mt-3 text-xs text-[var(--rc-navy)]/60">
        Unlimited care questions with cost forecasts, every bill checked, dispute letters and phone scripts, and your
        yearly picture.
      </p>
    </section>
  );
}
