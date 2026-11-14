import { FLAG_TITLES } from "@/lib/checks";
import type { FlagType } from "@/lib/checks/types";
import { formatCents } from "@/lib/money";

export type FlagView = {
  id: string;
  type: FlagType;
  message: string;
  explanation: string | null;
  potential_savings_cents: number;
};

export function FlagNote({ flag }: { flag: FlagView }) {
  return (
    <div className="mt-3 rounded-lg border border-[var(--rc-red)]/25 bg-[var(--rc-red)]/5 p-3 text-sm text-[var(--rc-red)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{FLAG_TITLES[flag.type]}</p>
        {flag.potential_savings_cents > 0 && (
          <p className="font-medium">Up to {formatCents(flag.potential_savings_cents)} worth asking about</p>
        )}
      </div>
      <p className="mt-1">{flag.message}</p>
      {flag.explanation && <p className="mt-2 text-[var(--rc-red)]">{flag.explanation}</p>}
    </div>
  );
}
