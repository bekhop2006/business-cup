"use client";

import { useActionState } from "react";
import { startCareCase } from "@/app/(app)/care/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// `example` fills the box for the shared demo account, so visitors only click.
export function CareDescriptionForm({ t, example }: { t: Dictionary["careForm"]; example?: string }) {
  const [state, action, pending] = useActionState(startCareCase, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        {t.question}
        <textarea name="description" required minLength={10} maxLength={2000} rows={5}
          defaultValue={state.description ?? example}
          placeholder={t.placeholder}
          className="mt-2 w-full rounded-lg border border-[var(--rc-navy)]/25 bg-white/70 p-4 text-base" />
      </label>
      <p className="text-xs text-[var(--rc-muted)]">{t.privacy}</p>
      {state.error && <p role="alert" className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--rc-accent)] px-5 py-3 font-medium disabled:opacity-60">
          {pending ? t.submitting : t.submit}
        </button>
        <button name="skipSummary" value="1" disabled={pending} className="min-h-11 px-2 py-3 text-sm underline underline-offset-4 disabled:opacity-60">{t.skipSummary}</button>
      </div>
      <p role="status" className="text-xs text-[var(--rc-muted)]">
        {pending ? t.pendingNote : t.freeNote}
      </p>
    </form>
  );
}
