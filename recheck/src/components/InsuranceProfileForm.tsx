"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/app/(onboarding)/onboarding/actions";
import { COMMON_INSURERS, type InsuranceInput } from "@/lib/profile/onboarding";

type Props = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  next: string;
  defaults: InsuranceInput;
  submitLabel: string;
};

const inputClass = "w-full rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base font-normal";
const labelClass = "flex flex-col gap-1 text-sm font-medium";
const hintClass = "text-xs font-normal text-slate-600";

function Field(props: {
  name: keyof InsuranceInput;
  label: string;
  hint?: string;
  defaults: InsuranceInput;
  money?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={labelClass}>
      {props.label}
      <span className="relative">
        {props.money && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">$</span>
        )}
        <input
          name={props.name}
          defaultValue={props.defaults[props.name]}
          inputMode={props.money ? "decimal" : undefined}
          placeholder={props.placeholder ?? "Not sure? Leave empty"}
          className={`${inputClass} ${props.money ? "pl-7" : ""}`}
        />
      </span>
      {props.hint && <span className={hintClass}>{props.hint}</span>}
    </label>
  );
}

export function InsuranceProfileForm({ action, next, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-slate-600">
        Everything is optional. You&apos;ll find most of it on your insurance card or your plan&apos;s
        Summary of Benefits. The more we know, the narrower your cost estimates.
      </p>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Your plan</legend>
        <label className={labelClass}>
          Insurance company
          <input name="insurerName" list="insurers" defaultValue={defaults.insurerName} placeholder="e.g. Aetna" className={inputClass} />
          <datalist id="insurers">
            {COMMON_INSURERS.map((insurer) => (
              <option key={insurer} value={insurer} />
            ))}
          </datalist>
        </label>
        <Field name="planName" label="Plan name" defaults={defaults} placeholder="e.g. Choice Plus" />
        <label className={labelClass}>
          Plan type
          <select name="planType" defaultValue={defaults.planType} className={inputClass}>
            <option value="">Not sure</option>
            <option value="PPO">PPO</option>
            <option value="HMO">HMO</option>
            <option value="EPO">EPO</option>
            <option value="POS">POS</option>
            <option value="HDHP">High-deductible (HDHP)</option>
            <option value="other">Other</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">This year</legend>
        <Field name="deductible" label="Deductible" money defaults={defaults} hint="What you pay each year before your plan starts sharing costs." />
        <Field name="deductibleMet" label="Already paid toward it" money defaults={defaults} hint="Your insurer's website or app shows this." />
        <Field name="oopMax" label="Out-of-pocket maximum" money defaults={defaults} hint="The most you'd pay in a year for covered care." />
        <Field name="oopMet" label="Already spent toward it" money defaults={defaults} />
        <Field name="coinsurance" label="Coinsurance (%)" defaults={defaults} placeholder="e.g. 20" hint="Your share of the cost after the deductible." />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 font-semibold">Copays</legend>
        <Field name="copayPrimary" label="Primary care" money defaults={defaults} placeholder="" />
        <Field name="copaySpecialist" label="Specialist" money defaults={defaults} placeholder="" />
        <Field name="copayUrgentCare" label="Urgent care" money defaults={defaults} placeholder="" />
        <Field name="copayEr" label="Emergency room" money defaults={defaults} placeholder="" />
      </fieldset>

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
