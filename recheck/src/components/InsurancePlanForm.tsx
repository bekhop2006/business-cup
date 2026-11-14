"use client";

import { useActionState } from "react";
import type { InsurancePlanState } from "@/app/(app)/dashboard/actions";

type Props = {
  action: (state: InsurancePlanState, formData: FormData) => Promise<InsurancePlanState>;
  year: number;
  deductible: string;
  oopMax: string;
};

const inputClass = "w-full rounded-lg border border-[var(--rc-navy)]/25 bg-white/60 px-3 py-2 text-base font-normal";

export function InsurancePlanForm({ action, year, deductible, oopMax }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="year" value={year} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Yearly deductible
        <input name="deductible" defaultValue={deductible} inputMode="decimal" placeholder="1,500.00" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Out-of-pocket maximum
        <input name="oopMax" defaultValue={oopMax} inputMode="decimal" placeholder="6,000.00" required className={inputClass} />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-[var(--rc-accent)] px-4 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--rc-red)] sm:col-span-3">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm sm:col-span-3">
          Saved.
        </p>
      )}
    </form>
  );
}
