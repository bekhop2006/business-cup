"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Shows an instant in the reader's own time zone. The server doesn't know it,
// so the time appears once the page is running in the browser.
export function LocalDateTime({ iso, localeTag }: { iso: string; localeTag: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => {
      const date = new Date(iso);
      // Browsers often ship without Kazakh month names and print "M11"; use digits.
      if (localeTag.startsWith("kk")) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      }
      return new Intl.DateTimeFormat(localeTag, {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      }).format(date);
    },
    () => null,
  );
  return <time dateTime={iso}>{text ?? "…"}</time>;
}
