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
    return <p className="mt-3 text-sm text-slate-600">No charges on this document.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
      {lines.map((line) => {
        const lineFlags = flags.filter((flag) => flag.line_item_id === line.id);
        return (
          <li key={line.id} className={`p-4 ${lineFlags.length > 0 ? "bg-amber-50/40" : ""}`}>
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-medium">{line.description ?? "No description"}</p>
                <p className="text-sm text-slate-600">
                  {[
                    line.code ?? "No code",
                    line.service_date && formatServiceDate(line.service_date),
                    line.quantity !== null && line.quantity > 1 && `${line.quantity} units`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {line.plain_explanation && (
                  <p className="mt-1 text-sm text-slate-700">{line.plain_explanation}</p>
                )}
              </div>
              <span className="font-medium tabular-nums">{formatCents(line.amount_cents)}</span>
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
