"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/app/(onboarding)/onboarding/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/locales";
import type { ServiceWithStatus } from "@/lib/preventive/schedule";
import { COVERAGE_SOURCE_URL } from "@/lib/preventive/services";
import { StatusBadge } from "@/components/PreventiveStatus";

type Props = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  next: string;
  items: ServiceWithStatus[];
  hiddenForMissingAge: number;
  hiddenForMissingSex: number;
  localeTag: string;
  submitLabel: string;
  savingLabel: string;
  t: Pick<Dictionary, "preventiveForm" | "preventiveServices" | "preventiveMethods">;
};

const inputClass = "rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base font-normal";

// Free preventive care: what applies to the person and when they last had it.
export function PreventiveForm(props: Props) {
  const { t, items } = props;
  const f = t.preventiveForm;
  const [state, formAction, pending] = useActionState(props.action, {});
  const groups = [
    { title: f.screenings, items: items.filter((item) => item.service.kind === "screening") },
    { title: f.vaccines, items: items.filter((item) => item.service.kind === "vaccine") },
  ].filter((group) => group.items.length > 0);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="next" value={props.next} />
      <p className="text-sm text-slate-600">
        {f.coverage}{" "}
        <a href={COVERAGE_SOURCE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {f.coverageLink}
        </a>
      </p>

      {groups.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-3">
          <legend className="mb-2 font-medium">{group.title}</legend>
          {group.title === f.vaccines && <p className="text-xs text-slate-600">{f.vaccineNote}</p>}
          {group.items.map((item) => (
            <ServiceRow key={item.service.id} item={item} t={t} localeTag={props.localeTag} />
          ))}
        </fieldset>
      ))}

      {(props.hiddenForMissingAge > 0 || props.hiddenForMissingSex > 0) && (
        <p className="text-sm text-slate-600">
          {props.hiddenForMissingAge > 0 && fill(f.hiddenAge, { n: props.hiddenForMissingAge })}{" "}
          {props.hiddenForMissingSex > 0 && fill(f.hiddenSex, { n: props.hiddenForMissingSex })}
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="self-start rounded-lg bg-[var(--rc-accent)] px-5 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? props.savingLabel : props.submitLabel}
      </button>
    </form>
  );
}

function ServiceRow({ item, t, localeTag }: { item: ServiceWithStatus; t: Props["t"]; localeTag: string }) {
  const f = t.preventiveForm;
  const { service, status } = item;
  const text = t.preventiveServices[service.id as keyof Props["t"]["preventiveServices"]];
  const lastMonth = status.kind === "not_recorded" ? "" : status.lastDoneOn.slice(0, 7);

  return (
    <div className="rounded-xl bg-[var(--rc-navy)]/4 p-4">
      <input type="hidden" name="service" value={service.id} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{text?.name ?? service.id}</p>
        <StatusBadge item={item} t={t} localeTag={localeTag} />
      </div>
      {text?.why && <p className="mt-1 text-sm text-slate-600">{text.why}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {f.lastDone}
          <input
            type="month"
            name={`done_${service.id}`}
            defaultValue={lastMonth}
            placeholder="YYYY-MM"
            aria-describedby={`hint-${service.id}`}
            className={inputClass}
          />
        </label>
        {service.methods && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            {f.whichTest}
            <select name={`method_${service.id}`} defaultValue={item.method ?? ""} className={inputClass}>
              {service.methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {t.preventiveMethods[method.id as keyof Props["t"]["preventiveMethods"]] ?? method.id}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p id={`hint-${service.id}`} className="mt-2 text-xs text-slate-600">
        {f.notYet} ·{" "}
        <a href={service.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {fill(f.source, { source: service.sourceName })}
        </a>
      </p>
    </div>
  );
}
