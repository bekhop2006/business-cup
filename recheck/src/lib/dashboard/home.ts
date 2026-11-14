import { sumCents } from "@/lib/money";

// Estimated savings from care choices: for each care question where the
// person chose a provider, the saved difference against the urgent care
// estimate. These are estimates, never money actually saved.
export type CaseSavings = { chosen_provider: unknown; estimated_savings_cents: number | null };

export function estimatedCareSavingsCents(cases: CaseSavings[]): number {
  return sumCents(
    cases
      .filter((careCase) => careCase.chosen_provider != null)
      .map((careCase) => Math.max(careCase.estimated_savings_cents ?? 0, 0)),
  );
}
