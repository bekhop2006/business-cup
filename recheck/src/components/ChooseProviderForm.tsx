"use client";

import { useActionState } from "react";
import { chooseCaseProvider } from "@/app/(app)/care/provider-actions";
import type { ComparisonRouteId } from "@/lib/care/routes";

export function ChooseProviderForm({ caseId, route, providerId }: { caseId: string; route: ComparisonRouteId; providerId: string }) {
  const [state, action, pending] = useActionState(chooseCaseProvider, {});
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="route" value={route} />
      <input type="hidden" name="providerId" value={providerId} />
      <button disabled={pending} className="min-h-11 rounded-lg border border-[var(--rc-navy)]/25 px-4 py-2 text-sm font-medium hover:bg-[var(--rc-navy)]/5 disabled:opacity-60">
        {pending ? "Saving choice…" : "Choose this provider"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-[var(--rc-red)]">{state.error}</p>}
    </form>
  );
}
