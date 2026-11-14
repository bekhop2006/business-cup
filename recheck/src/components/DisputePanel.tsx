"use client";

import { useState } from "react";

type Draft = { letter_text: string; call_script: string };

type Props = {
  visitId: string;
  initialDraft: Draft | null;
  fileStem: string;
};

export function DisputePanel({ visitId, initialDraft, fileStem }: Props) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function write() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/visits/${visitId}/dispute`, { method: "POST" });
      const result: Partial<Draft> & { error?: string } = await response.json();
      if (!response.ok || !result.letter_text || !result.call_script) {
        setError(result.error ?? "We couldn't write the letter just now. Please try again.");
      } else {
        setDraft({ letter_text: result.letter_text, call_script: result.call_script });
      }
    } catch {
      setError("We couldn't write the letter. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-slate-200 p-4 sm:p-6">
      <h2 className="font-semibold">Ask the provider to fix it</h2>
      <p className="mt-1 text-sm text-slate-600">
        We&apos;ll write a letter to the billing office and a script for calling them, based on what
        we found. Read it before you send it, and fill in the parts in [brackets].
      </p>

      {draft ? (
        <>
          <DraftBlock title="Dispute letter" text={draft.letter_text} fileName={`${fileStem}-dispute-letter.txt`} />
          <DraftBlock title="Phone script" text={draft.call_script} fileName={`${fileStem}-call-script.txt`} />
          <button onClick={write} disabled={pending} className="mt-4 text-sm font-medium underline disabled:opacity-60">
            {pending ? "Writing…" : "Write it again"}
          </button>
        </>
      ) : (
        <button
          onClick={write}
          disabled={pending}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Writing your letter…" : "Write a dispute letter"}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Recheck helps you ask questions about a bill. It is not legal or medical advice.
      </p>
    </section>
  );
}

function DraftBlock({ title, text, fileName }: { title: string; text: string; fileName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <div className="flex gap-2 text-sm">
          <button onClick={copy} className="rounded-lg border border-slate-300 px-3 py-1.5">
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="rounded-lg border border-slate-300 px-3 py-1.5">
            Download
          </button>
        </div>
      </div>
      <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap font-sans">
        {text}
      </pre>
    </div>
  );
}
