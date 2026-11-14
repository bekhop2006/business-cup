// Basis points: 10,000 bps = 100%. Coinsurance and price multipliers are kept
// in basis points so money math stays in integer cents.
export const BPS_PER_WHOLE = 10_000;

// `cents` × `bps` / 10,000, rounded to the nearest cent.
export function applyBps(cents: number, bps: number): number {
  return Math.round((cents * bps) / BPS_PER_WHOLE);
}
