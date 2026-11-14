import { FlagNote, type FlagView } from "@/components/FlagNote";
import { formatServiceDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

type Line = {
  id: string;
  code: string | null;
  description: string | null;
  plain_explanation?: string | null;
  service_date: string | null;
  quantity: number | null;
  amount_cents: number;
};

type Props = {
  lines: Line[];
  // Flags about single lines, shown under the line they are about.
  flags?: (FlagView & { line_item_id: string | null })[];
};

export function LineItemsList({ lines, flags = [] }: Props) {
  if (lines.length === 0) {
    return <p className="mt-3 text-sm text-[var(--rc-navy)]/70">No charges on this document.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-[var(--rc-navy)]/15 rounded-xl border border-[var(--rc-navy)]/15">
      {lines.map((line) => {
        const lineFlags = flags.filter((flag) => flag.line_item_id === line.id);
        return (
          <li key={line.id} className={`p-4 ${lineFlags.length > 0 ? "bg-[var(--rc-red)]/3" : ""}`}>
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="break-words font-medium">{line.description ?? "No description"}</p>
                <p className="text-sm text-[var(--rc-navy)]/70">
                  {[
                    line.code ?? "No code",
                    line.service_date && formatServiceDate(line.service_date),
                    line.quantity !== null && line.quantity > 1 && `${line.quantity} units`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {line.plain_explanation && (
                  <p className="mt-1 text-sm text-[var(--rc-navy)]/80">{line.plain_explanation}</p>
                )}
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatCents(line.amount_cents)}</span>
            </div>
            {lineFlags.map((flag) => (
              <FlagNote key={flag.id} flag={flag} />
            ))}
          </li>
        );
      })}
    </ul>
  );
}
