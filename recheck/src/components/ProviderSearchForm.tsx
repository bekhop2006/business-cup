"use client";

import { useActionState } from "react";
import { searchCaseProviders } from "@/app/(app)/care/provider-actions";
import type { ComparisonRouteId } from "@/lib/care/routes";

export function ProviderSearchForm({ caseId, route, zip }: { caseId: string; route: ComparisonRouteId; zip: string }) {
  const [state, action, pending] = useActionState(searchCaseProviders, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="route" value={route} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          ZIP code
          <input name="zip" required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" autoComplete="postal-code"
            defaultValue={zip} placeholder="Your 5-digit ZIP" className="min-h-11 w-44 rounded-lg border border-[var(--rc-navy)]/25 bg-white/70 px-3 py-2 text-base" />
        </label>
        <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--rc-accent)] px-5 py-3 text-sm font-medium disabled:opacity-60">
          {pending ? "Searching real directories…" : "Search providers"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      <p role="status" className="text-xs text-[var(--rc-muted)]">
        {pending ? "Finding providers and saving results. This can take a few moments." : "Only the ZIP and care type are sent to the directory. Your symptom description and insurance details are not sent."}
      </p>
    </form>
  );
}
