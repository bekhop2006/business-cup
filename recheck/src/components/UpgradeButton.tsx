"use client";

import { useState } from "react";

export function UpgradeButton({ label = "Upgrade to Recheck Plus" }: { label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) {
        setError(result.error ?? "We couldn't open the payment page. Please try again.");
        setPending(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("We couldn't open the payment page. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={upgrade}
        disabled={pending}
        className="rounded-lg bg-[var(--rc-accent)] px-4 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? "Opening the payment page…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--rc-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
