const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-03-12" -> "Mar 12, 2026". Service dates have no time zone.
export function formatServiceDate(isoDate: string, localeTag?: string): string {
  // Browsers often ship without Kazakh month names and print "M11"; use digits.
  if (localeTag?.startsWith("kk")) {
    const [year, month, day] = isoDate.slice(0, 10).split("-");
    return `${day}.${month}.${year}`;
  }
  const format = localeTag
    ? new Intl.DateTimeFormat(localeTag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : dateFormat;
  return format.format(new Date(`${isoDate}T00:00:00Z`));
}
