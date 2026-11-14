import type { Scenario } from "@/lib/costs/scenarios";
import { COMMERCIAL_MULTIPLIER, PFS_SOURCE } from "@/lib/costs/benchmarks";
import { formatCents } from "@/lib/money";

export function priceRange(range: { lowCents: number; highCents: number }): string {
  return range.lowCents === range.highCents ? formatCents(range.lowCents) : `${formatCents(range.lowCents)}–${formatCents(range.highCents)}`;
}

export function CostForecast({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <section className="mt-5">
      <h3 className="font-semibold">What you might pay</h3>
      <p className="mt-1 text-sm text-[var(--rc-muted)]">These are possible billing scenarios. This does not mean you need an X-ray or MRI.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {scenarios.map((scenario) => (
          <article key={scenario.id} className="rounded-lg bg-[var(--rc-navy)]/4 p-4">
            <h4 className="text-sm font-medium">{scenario.label}</h4>
            <p className="mt-2 text-lg font-semibold tabular-nums">{priceRange(scenario.patientShare)}</p>
            <p className="text-xs text-[var(--rc-muted)]">Your estimated share</p>
            <details className="mt-3 text-xs leading-relaxed">
              <summary className="cursor-pointer py-2 font-medium">How this is estimated</summary>
              <p>Medicare benchmark: {formatCents(scenario.medicareCents)}. Assumed commercial allowed amount: {priceRange(scenario.benchmark)}.</p>
              <p className="mt-2">Profile completeness: {scenario.confidence}. These are not quotes from a clinic.</p>
              <ul className="mt-2 list-disc space-y-2 pl-4">{scenario.assumptions.map((text) => <li key={text}>{text}</li>)}</ul>
              {scenario.unknowns.length > 0 && <><p className="mt-3 font-medium">Missing details</p><ul className="list-disc pl-4">{scenario.unknowns.map((text) => <li key={text}>{text}</li>)}</ul></>}
              <p className="mt-3 font-medium">Not included</p>
              <ul className="list-disc space-y-1 pl-4">{scenario.notIncluded.map((text) => <li key={text}>{text}</li>)}</ul>
              <p className="mt-3">Codes: {scenario.items.map((item) => item.cpt).join(", ")}. Actual billing may differ.</p>
            </details>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--rc-muted)]">Sources: <a href={PFS_SOURCE.url} target="_blank" rel="noreferrer" className="underline">CMS Medicare PFS {PFS_SOURCE.year}</a>; commercial multiplier assumption ×{COMMERCIAL_MULTIPLIER.lowBps / 10000}–{COMMERCIAL_MULTIPLIER.highBps / 10000} from <a href={COMMERCIAL_MULTIPLIER.source.url} target="_blank" rel="noreferrer" className="underline">KFF ({COMMERCIAL_MULTIPLIER.source.year})</a>. Insurance network participation is not verified.</p>
    </section>
  );
}
