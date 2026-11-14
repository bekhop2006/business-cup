"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryReadingButton({ documentId, label }: { documentId: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/process`, { method: "POST" });
      if (!response.ok) {
        const result: { error?: string } = await response.json();
        setError(result.error ?? "That didn't work. Please try again.");
      }
      router.refresh();
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={retry}
        disabled={pending}
        className="rounded-lg bg-[var(--rc-accent)] px-4 py-2 text-sm font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? "Starting…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
