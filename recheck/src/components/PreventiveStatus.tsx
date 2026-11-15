import { formatServiceDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/locales";
import type { ServiceWithStatus } from "@/lib/preventive/schedule";

// Where a preventive service stands: not recorded, due, or up to date.
export function StatusBadge({
  item,
  t,
  localeTag,
}: {
  item: ServiceWithStatus;
  t: Pick<Dictionary, "preventiveForm">;
  localeTag: string;
}) {
  const date = (iso: string) => formatServiceDate(iso, localeTag);
  const f = t.preventiveForm;
  const { status } = item;
  if (status.kind === "not_recorded") {
    return <span className="rounded-full bg-[var(--rc-navy)]/8 px-2.5 py-0.5 text-xs">{f.statusNotRecorded}</span>;
  }
  if (status.kind === "due") {
    return (
      <span className="rounded-full bg-[var(--rc-accent)] px-2.5 py-0.5 text-xs text-[var(--rc-navy)]">
        {f.statusDue} · {fill(f.doneOn, { date: date(status.lastDoneOn) })}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-900">
      {f.statusUpToDate} · {status.nextDueOn ? fill(f.nextDue, { date: date(status.nextDueOn) }) : f.noFixedSchedule}
    </span>
  );
}
