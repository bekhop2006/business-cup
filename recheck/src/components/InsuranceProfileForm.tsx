"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/app/(onboarding)/onboarding/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { COMMON_INSURERS, type InsuranceInput } from "@/lib/profile/onboarding";

type Props = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  next: string;
  defaults: InsuranceInput;
  submitLabel: string;
  t: Dictionary["insuranceForm"];
  savingLabel: string;
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
  emptyPlaceholder: string;
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
          placeholder={props.placeholder ?? props.emptyPlaceholder}
          className={`${inputClass} ${props.money ? "pl-7" : ""}`}
        />
      </span>
      {props.hint && <span className={hintClass}>{props.hint}</span>}
    </label>
  );
}

export function InsuranceProfileForm({ action, next, defaults, submitLabel, t, savingLabel }: Props) {
  const empty = t.leaveEmpty;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-slate-600">{t.intro}</p>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">{t.yourPlan}</legend>
        <label className={labelClass}>
          {t.insurer}
          <input name="insurerName" list="insurers" defaultValue={defaults.insurerName} placeholder={t.insurerPlaceholder} className={inputClass} />
          <datalist id="insurers">
            {COMMON_INSURERS.map((insurer) => (
              <option key={insurer} value={insurer} />
            ))}
          </datalist>
        </label>
        <Field name="planName" label={t.planName} defaults={defaults} placeholder={t.planNamePlaceholder} emptyPlaceholder={empty} />
        <label className={labelClass}>
          {t.planType}
          <select name="planType" defaultValue={defaults.planType} className={inputClass}>
            <option value="">{t.notSure}</option>
            <option value="PPO">PPO</option>
            <option value="HMO">HMO</option>
            <option value="EPO">EPO</option>
            <option value="POS">POS</option>
            <option value="HDHP">{t.hdhp}</option>
            <option value="other">{t.other}</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">{t.thisYear}</legend>
        <Field name="deductible" label={t.deductible} money defaults={defaults} hint={t.deductibleHint} emptyPlaceholder={empty} />
        <Field name="deductibleMet" label={t.deductibleMet} money defaults={defaults} hint={t.deductibleMetHint} emptyPlaceholder={empty} />
        <Field name="oopMax" label={t.oopMax} money defaults={defaults} hint={t.oopMaxHint} emptyPlaceholder={empty} />
        <Field name="oopMet" label={t.oopMet} money defaults={defaults} emptyPlaceholder={empty} />
        <Field name="coinsurance" label={t.coinsurance} defaults={defaults} placeholder={t.coinsurancePlaceholder} hint={t.coinsuranceHint} emptyPlaceholder={empty} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 font-semibold">{t.copays}</legend>
        <Field name="copayPrimary" label={t.primaryCare} money defaults={defaults} placeholder="" emptyPlaceholder={empty} />
        <Field name="copaySpecialist" label={t.specialist} money defaults={defaults} placeholder="" emptyPlaceholder={empty} />
        <Field name="copayUrgentCare" label={t.urgentCare} money defaults={defaults} placeholder="" emptyPlaceholder={empty} />
        <Field name="copayEr" label={t.er} money defaults={defaults} placeholder="" emptyPlaceholder={empty} />
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
        {pending ? savingLabel : submitLabel}
      </button>
    </form>
  );
}
