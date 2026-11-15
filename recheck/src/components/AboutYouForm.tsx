"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/app/(onboarding)/onboarding/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { AboutYouDefaults } from "@/lib/profile/onboarding";

type Props = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  next: string;
  defaults: AboutYouDefaults;
  submitLabel: string;
  t: Dictionary["aboutForm"];
  savingLabel: string;
};

const inputClass = "rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base font-normal";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

export function AboutYouForm({ action, next, defaults, submitLabel, t, savingLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className={labelClass}>
        {t.name}
        <input name="fullName" defaultValue={defaults.fullName} autoComplete="name" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {t.zip}
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
        <span className="text-xs font-normal text-slate-600">{t.zipHint}</span>
      </label>
      <label className={labelClass}>
        {t.household} <span className="font-normal text-slate-600">{t.optional}</span>
        <input
          name="householdSize"
          defaultValue={defaults.householdSize}
          inputMode="numeric"
          className={`${inputClass} sm:w-40`}
        />
      </label>
      <fieldset className="flex flex-col gap-4 border-t border-[var(--rc-navy)]/10 pt-4">
        <legend className="sr-only">{t.preventiveLegend}</legend>
        <p className="text-sm text-slate-600">{t.preventiveHint}</p>
        <div className="flex flex-wrap gap-4">
          <label className={labelClass}>
            {t.birthYear} <span className="font-normal text-slate-600">{t.optional}</span>
            <input
              name="birthYear"
              defaultValue={defaults.birthYear}
              inputMode="numeric"
              autoComplete="bday-year"
              pattern="\d{4}"
              maxLength={4}
              className={`${inputClass} w-32`}
            />
          </label>
          <label className={labelClass}>
            {t.sex} <span className="font-normal text-slate-600">{t.optional}</span>
            <select name="sex" defaultValue={defaults.sex} className={`${inputClass} w-48`}>
              <option value="">{t.sexSkip}</option>
              <option value="female">{t.sexFemale}</option>
              <option value="male">{t.sexMale}</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="tbRisk" defaultChecked={defaults.tbRisk} className="mt-1 size-4" />
          <span>{t.tbRisk}</span>
        </label>
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
