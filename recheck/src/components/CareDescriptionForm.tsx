"use client";

import { useActionState } from "react";
import { startCareCase } from "@/app/(app)/care/actions";

export function CareDescriptionForm() {
  const [state, action, pending] = useActionState(startCareCase, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        What happened, and how long has it been bothering you?
        <textarea name="description" required minLength={10} maxLength={2000} rows={5}
          defaultValue={state.description}
          placeholder="My knee has hurt for a week after tennis. I can walk, but stairs are uncomfortable."
          className="mt-2 w-full rounded-lg border border-[var(--rc-navy)]/25 bg-white/70 p-4 text-base" />
      </label>
      <p className="text-xs text-[var(--rc-muted)]">Please leave out insurance member IDs and other details we don&apos;t need.</p>
      {state.error && <p role="alert" className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--rc-accent)] px-5 py-3 font-medium disabled:opacity-60">
          {pending ? "Saving your question…" : "Continue to safety questions"}
        </button>
        <button name="skipSummary" value="1" disabled={pending} className="min-h-11 px-2 py-3 text-sm underline underline-offset-4 disabled:opacity-60">Skip AI summary</button>
      </div>
      <p role="status" className="text-xs text-[var(--rc-muted)]">
        {pending ? "This can take a moment. If you need urgent care, don't wait for this page." : "Safety questions and warnings are always free."}
      </p>
    </form>
  );
}
