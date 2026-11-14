"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/app/(onboarding)/onboarding/actions";

type Props = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  next: string;
  defaults: { fullName: string; zipCode: string; householdSize: string };
  submitLabel: string;
};

const inputClass = "rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base font-normal";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

export function AboutYouForm({ action, next, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className={labelClass}>
        Your name
        <input name="fullName" defaultValue={defaults.fullName} autoComplete="name" required className={inputClass} />
      </label>
      <label className={labelClass}>
        ZIP code
        <input
          name="zipCode"
          defaultValue={defaults.zipCode}
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="\d{5}"
          maxLength={5}
          required
          className={`${inputClass} sm:w-40`}
        />
        <span className="text-xs font-normal text-slate-600">We use it to find care near you.</span>
      </label>
      <label className={labelClass}>
        People in your household <span className="font-normal text-slate-600">(optional)</span>
        <input
          name="householdSize"
          defaultValue={defaults.householdSize}
          inputMode="numeric"
          className={`${inputClass} sm:w-40`}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="self-start rounded-lg bg-[var(--rc-accent)] px-5 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
