import { formatServiceDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

type Line = {
  id: string;
  code: string | null;
  description: string | null;
  service_date: string | null;
  quantity: number | null;
  amount_cents: number;
};

export function LineItemsList({ lines }: { lines: Line[] }) {
  if (lines.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">No charges on this document.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
      {lines.map((line) => (
        <li key={line.id} className="flex justify-between gap-4 p-4">
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
          </div>
          <span className="font-medium tabular-nums">{formatCents(line.amount_cents)}</span>
        </li>
      ))}
    </ul>
  );
}
