"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Shows an instant in the reader's own time zone. The server doesn't know it,
// so the time appears once the page is running in the browser.
export function LocalDateTime({ iso, localeTag }: { iso: string; localeTag: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(localeTag, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(iso)),
    () => null,
  );
  return <time dateTime={iso}>{text ?? "…"}</time>;
}
