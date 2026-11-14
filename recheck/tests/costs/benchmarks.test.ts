import { describe, expect, it } from "vitest";
import {
  commercialPriceRange,
  COMMERCIAL_MULTIPLIER,
  MEDICARE_BENCHMARKS,
  medicareCents,
  PFS_SOURCE,
  type PfsAmount,
} from "@/lib/costs/benchmarks";

// National amount = total RVUs × conversion factor, rounded to the cent.
// RVUs are in hundredths and the factor in ten-thousandths, so the product
// is in millionths of a dollar: divide by 10,000 to get cents.
function recompute(amount: PfsAmount): number {
  return Math.round((amount.totalRvuHundredths * PFS_SOURCE.conversionFactorTenThousandths) / 10_000);
}

describe("MEDICARE_BENCHMARKS", () => {
  it("matches total RVUs × the 2026 conversion factor for every amount", () => {
    for (const benchmark of Object.values(MEDICARE_BENCHMARKS)) {
      for (const amount of [benchmark.office, benchmark.facility]) {
        if (amount) expect(amount.cents).toBe(recompute(amount));
      }
    }
  });

  it("holds the published 2026 national amounts", () => {
    expect(medicareCents("99203", "office")).toBe(11_757);
    expect(medicareCents("99203", "facility")).toBe(7_148);
    expect(medicareCents("99284", "facility")).toBe(11_824);
    expect(medicareCents("73562", "office")).toBe(4_242);
    expect(medicareCents("73721", "office")).toBe(20_441);
    expect(MEDICARE_BENCHMARKS["73562"].facility.modifier).toBe("26");
  });

  it("cites a CMS source and year", () => {
    expect(PFS_SOURCE.year).toBe(2026);
    expect(PFS_SOURCE.url).toMatch(/^https:\/\/www\.cms\.gov\//);
  });

  it("refuses an office amount that Medicare doesn't pay", () => {
    expect(() => medicareCents("99284", "office")).toThrow(/No Medicare office amount/);
  });
});

describe("commercialPriceRange", () => {
  it("is labeled as an assumption with a cited source", () => {
    expect(COMMERCIAL_MULTIPLIER.isAssumption).toBe(true);
    expect(COMMERCIAL_MULTIPLIER.source.url).toMatch(/^https:\/\/www\.kff\.org\//);
  });

  it("applies the 118%-179% range in whole cents", () => {
    expect(commercialPriceRange(11_757)).toEqual({ lowCents: 13_873, highCents: 21_045 });
    expect(commercialPriceRange(0)).toEqual({ lowCents: 0, highCents: 0 });
  });
});
