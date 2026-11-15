"use client";

import { useActionState, useState } from "react";
import { bookAppointment, updateAppointmentStatus } from "@/app/(app)/care/provider-actions";
import type { AppointmentStage } from "@/lib/care/appointment";

type Props = {
  caseId: string;
  appointmentAt: string | null;
  stage: AppointmentStage | null;
  phone: string | null;
  email: { subject: string; body: string };
};

const appointmentFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

// Booking happens between the person and the clinic. We help them ask, then
// keep the date they tell us.
export function BookAppointment({ caseId, appointmentAt, stage, phone, email }: Props) {
  const [state, formAction, pending] = useActionState(bookAppointment, {});
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(stage === null || stage === "cancelled");
  const emailText = `Subject: ${email.subject}\n\n${email.body}`;

  // The browser knows the person's time zone; send the exact instant.
  const submit = (form: FormData) => {
    const local = String(form.get("local") ?? "");
    const instant = local ? new Date(local) : null;
    form.set("appointmentAt", instant && !Number.isNaN(instant.getTime()) ? instant.toISOString() : "");
    formAction(form);
  };

  return (
    <div id="book" className="mt-6 scroll-mt-6 rounded-xl bg-[var(--rc-navy)]/4 p-5">
      <h3 className="font-medium">Book this visit</h3>
      <p className="mt-1 text-sm text-[var(--rc-muted)]">
        Recheck doesn&apos;t book for you. Call or email the clinic, ask the questions above, then save the time here so we can remind you and help with the bill afterwards.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="min-h-11 rounded-lg bg-[var(--rc-navy)] px-4 py-2 text-sm text-[var(--rc-ivory)]">
            Call {phone}
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(emailText);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="min-h-11 rounded-lg border border-[var(--rc-navy)]/25 px-4 py-2 text-sm"
        >
          {copied ? "Email text copied" : "Copy email text"}
        </button>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer underline underline-offset-4">Show the email</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-sans text-sm">{emailText}</pre>
      </details>

      {appointmentAt && stage === "upcoming" && !editing && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <p className="font-medium">
            Booked for <time dateTime={appointmentAt} suppressHydrationWarning>{appointmentFormat.format(new Date(appointmentAt))}</time>
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={`/care/${caseId}/appointment.ics`} className="underline underline-offset-4">Add to calendar</a>
            <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-4">Change time</button>
            <StatusButton caseId={caseId} status="cancelled" label="Cancelled" />
          </div>
        </div>
      )}

      {appointmentAt && stage === "after_visit" && (
        <div className="mt-4 rounded-lg border border-[var(--rc-navy)]/20 bg-white/70 p-4 text-sm">
          <p className="font-medium">How did the visit go? Add your bill and we&apos;ll check the charges.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <StatusButton caseId={caseId} status="done" label="I went — add my bill" primary />
            <StatusButton caseId={caseId} status="cancelled" label="It didn't happen" />
          </div>
        </div>
      )}

      {stage === "done" && <p className="mt-4 text-sm">Visit done. <a href="/upload" className="font-medium underline">Add a bill</a> when it arrives.</p>}

      {editing && stage !== "done" && (
        <form action={submit} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="caseId" value={caseId} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            I booked it for
            <input type="datetime-local" name="local" required className="rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-base font-normal" />
          </label>
          <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--rc-accent)] px-4 py-2 text-sm font-medium text-[var(--rc-navy)] disabled:opacity-60">
            {pending ? "Saving…" : "Save appointment"}
          </button>
        </form>
      )}
      {state.error && <p role="alert" className="mt-2 text-sm text-[var(--rc-red)]">{state.error}</p>}
    </div>
  );
}

function StatusButton({ caseId, status, label, primary }: { caseId: string; status: "done" | "cancelled"; label: string; primary?: boolean }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="next" value="case" />
      <button className={primary ? "font-medium underline underline-offset-4" : "underline underline-offset-4"}>{label}</button>
    </form>
  );
}
