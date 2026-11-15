"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { askAction, type AskState } from "@/app/(app)/ask/actions";
import { Paywall } from "@/components/Paywall";

const EXAMPLES = [
  "Is a flu shot free with my insurance?",
  "What's the difference between a copay and coinsurance?",
  "I got a bill from an out-of-network anesthesiologist after surgery at an in-network hospital. What are my rights?",
  "Do I need a referral to see a specialist on an HMO?",
];

const LEVEL = {
  federal: "Federal law — all states",
  california: "California — only plans regulated by the state",
} as Record<string, string>;

export function AskForm() {
  const [state, formAction, pending] = useActionState<AskState, FormData>(askAction, {});
  const field = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <label htmlFor="question" className="text-sm font-medium">Your question</label>
        <textarea
          ref={field}
          id="question"
          name="question"
          rows={3}
          maxLength={500}
          required
          defaultValue={state.question}
          key={state.question ?? "empty"}
          placeholder="Ask about your insurance, a bill or free preventive care"
          className="rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base"
        />
        <p className="text-xs text-[var(--rc-muted)]">Leave out member IDs and other personal details. We don&apos;t store your question.</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => { if (field.current) field.current.value = example; }}
              className="rounded-full bg-[var(--rc-navy)]/6 px-3 py-1.5 text-left text-xs hover:bg-[var(--rc-navy)]/10"
            >
              {example}
            </button>
          ))}
        </div>
        <button disabled={pending} className="self-start rounded-lg bg-[var(--rc-accent)] px-5 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60">
          {pending ? "Looking it up…" : "Ask"}
        </button>
        {state.error && <p role="alert" className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      </form>

      {state.paywall && (
        <Paywall title="Ask more questions with Recheck Plus">
          Your free question is used. Recheck Plus answers every question from official sources.
        </Paywall>
      )}

      {state.result?.kind === "answer" && (
        <section aria-live="polite" className="mt-6 rounded-xl border border-[var(--rc-navy)]/15 p-5">
          <h2 className="font-medium">Answer</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{state.result.answer}</p>
          <h3 className="mt-4 text-sm font-medium">Sources</h3>
          <ol className="mt-2 space-y-2 text-sm">
            {state.result.sources.map((source) => (
              <li key={source.url} className="flex flex-col gap-0.5">
                <span>
                  {source.ns.map((n) => `[${n}]`).join("")}{" "}
                  <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.title}</a>
                  {" · "}{source.publisher}
                </span>
                <span className="text-xs text-[var(--rc-muted)]">{LEVEL[source.jurisdiction] ?? source.jurisdiction} · checked {source.checkedOn}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[var(--rc-muted)]">
            General information from official sources, not legal or medical advice. Your plan&apos;s documents decide what it covers; confirm with your insurer.
          </p>
        </section>
      )}

      {state.result?.kind === "not_in_sources" && (
        <section aria-live="polite" className="mt-6 rounded-xl border border-[var(--rc-navy)]/15 p-5 text-sm">
          <h2 className="font-medium">I don&apos;t know</h2>
          <p className="mt-2">The official documents we use don&apos;t answer this. Call your insurer — the number is on your insurance card — or try asking another way.</p>
        </section>
      )}

      {state.result?.kind === "symptoms" && (
        <section aria-live="polite" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-950">
          <h2 className="font-medium">This sounds like a question about symptoms</h2>
          <p className="mt-2">
            Recheck can&apos;t give medical advice. If it might be an emergency, <a href="tel:911" className="font-medium underline">call 911</a>.
            Otherwise, <Link href="/care/new" className="font-medium underline">describe it in Get care</Link> — we&apos;ll check for warning signs and show where to go.
          </p>
        </section>
      )}

      {state.result && state.lastFree && (
        <p className="mt-3 text-xs text-[var(--rc-muted)]">That was your free question. Recheck Plus answers as many as you need.</p>
      )}
    </>
  );
}
