"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_MS = 2500;

// Re-renders the page every few seconds so the document status updates.
export function RefreshWhileReading() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
