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
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{FLAG_TITLES[flag.type]}</p>
        {flag.potential_savings_cents > 0 && (
          <p className="font-medium">Up to {formatCents(flag.potential_savings_cents)} worth asking about</p>
        )}
      </div>
      <p className="mt-1">{flag.message}</p>
      {flag.explanation && <p className="mt-2 text-amber-900">{flag.explanation}</p>}
    </div>
  );
}
