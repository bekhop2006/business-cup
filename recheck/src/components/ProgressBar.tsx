import type { Progress } from "@/lib/dashboard/yearly";
import { fill } from "@/lib/i18n/locales";
import { formatCents } from "@/lib/money";

export function ProgressBar({ label, progress, of = "{used} of {limit}" }: { label: string; progress: Progress; of?: string }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {fill(of, { used: formatCents(progress.usedCents), limit: formatCents(progress.limitCents) })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--rc-navy)]/10"
      >
        <div className="h-full rounded-full bg-[var(--rc-navy)]" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}
