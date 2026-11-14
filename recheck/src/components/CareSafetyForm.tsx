"use client";

import { useActionState, useState } from "react";
import { saveSafetyAnswers } from "@/app/(app)/care/actions";
import { assessUrgency, SAFETY_QUESTIONS, type SafetyAnswers, type SafetyQuestionId } from "@/lib/care/safety";
import { CareSafetyNotice } from "@/components/CareSafetyNotice";

export function CareSafetyForm({ caseId, defaults, mentioned, scope }: {
  caseId: string;
  defaults: SafetyAnswers;
  mentioned: SafetyQuestionId[];
  scope?: "knee_leg" | "other";
}) {
  const [answers, setAnswers] = useState<SafetyAnswers>(defaults);
  const [state, action, pending] = useActionState(saveSafetyAnswers, {});
  const yesAnswers = Object.fromEntries(Object.entries(answers).filter(([, answer]) => answer === true));
  const hasWarning = Object.keys(yesAnswers).length > 0;
  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="caseId" value={caseId} />
      <h2 className="text-xl font-semibold">First, check for warning signs</h2>
      <p className="text-sm text-[var(--rc-muted)]">Confirm these answers yourself. This check covers knee or leg pain and cannot rule out every emergency.</p>
      {hasWarning && <CareSafetyNotice assessment={assessUrgency(yesAnswers)} />}
      <fieldset className="rounded-lg border border-[var(--rc-navy)]/15 p-4">
        <legend className="px-1 text-sm font-medium">Is your question about knee or leg pain?</legend>
        <div className="flex flex-wrap gap-4">
          {([['knee_leg', 'Yes'], ['other', 'No / not sure']] as const).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="scope" value={value} required defaultChecked={scope === value} />{label}
            </label>
          ))}
        </div>
      </fieldset>
      {SAFETY_QUESTIONS.map((question) => (
        <fieldset key={question.id} className="rounded-lg border border-[var(--rc-navy)]/15 p-4">
          <legend className="max-w-full px-1 text-sm font-medium">{question.question}</legend>
          {mentioned.includes(question.id) && <p className="mb-2 text-xs text-[var(--rc-muted)]">Your description may mention this. Please confirm.</p>}
          <div className="flex flex-wrap gap-4">
            {([['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']] as const).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name={question.id} value={value}
                  checked={value === "unsure" ? answers[question.id] === undefined : answers[question.id] === (value === "yes")}
                  onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: value === "unsure" ? undefined : value === "yes" }))} />{label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {state.error && <p role="alert" className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--rc-accent)] px-5 py-3 font-medium disabled:opacity-60">
        {pending ? "Saving…" : "Save answers and see next steps"}
      </button>
    </form>
  );
}
