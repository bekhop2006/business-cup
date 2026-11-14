import { describe, expect, it } from "vitest";
import {
  formatCents,
  formatCentsForInput,
  parseMoneyToCents,
  sumCents,
} from "@/lib/money";

describe("parseMoneyToCents", () => {
  it("reads amounts the way bills print them", () => {
    expect(parseMoneyToCents("$1,450.00")).toBe(145000);
    expect(parseMoneyToCents("$45.00")).toBe(4500);
    expect(parseMoneyToCents("96")).toBe(9600);
    expect(parseMoneyToCents("12.5")).toBe(1250);
    expect(parseMoneyToCents(" $ 2,522.00 ")).toBe(252200);
  });

  it("reads negative amounts written with a minus or parentheses", () => {
    expect(parseMoneyToCents("-$148.40")).toBe(-14840);
    expect(parseMoneyToCents("$-148.40")).toBe(-14840);
    expect(parseMoneyToCents("($41.60)")).toBe(-4160);
  });

  it("rejects text that is not an amount", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("N/A")).toBeNull();
    expect(parseMoneyToCents("$1,45.00")).toBeNull();
    expect(parseMoneyToCents("12.345")).toBeNull();
    expect(parseMoneyToCents("-($5.00)")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats cents for display", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-4160)).toBe("-$41.60");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats cents for form fields without float rounding", () => {
    expect(formatCentsForInput(123456)).toBe("1234.56");
    expect(formatCentsForInput(5)).toBe("0.05");
    expect(formatCentsForInput(-4160)).toBe("-41.60");
  });

  it("adds cents exactly", () => {
    expect(sumCents([14840, 4160, 4000])).toBe(23000);
    expect(sumCents([])).toBe(0);
  });
});
