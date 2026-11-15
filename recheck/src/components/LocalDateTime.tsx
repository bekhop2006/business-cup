"use client";

// Shows an instant in the reader's own time zone. The server renders UTC
// first; the browser replaces it with local time.
export function LocalDateTime({ iso, localeTag }: { iso: string; localeTag: string }) {
  const text = new Intl.DateTimeFormat(localeTag, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
