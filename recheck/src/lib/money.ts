// Money is integer cents everywhere. These functions are the only place where
// text becomes cents and cents become text.

const AMOUNT_PATTERN = /^(-)?\$?(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

// Parses an amount as printed on a document: "$1,450.00", "-$148.40",
// "($41.60)", "96", "12.5". Returns null when the text is not an amount.
export function parseMoneyToCents(text: string): number | null {
  let value = text.replace(/\s+/g, "");
  let negative = false;
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }

  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return null;
  const [, signBefore, signAfter, whole, fraction = ""] = match;
  if ([signBefore, signAfter, negative].filter(Boolean).length > 1) return null;

  const cents =
    Number(whole.replaceAll(",", "")) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return signBefore || signAfter || negative ? -cents : cents;
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// "$1,234.56" for display.
export function formatCents(cents: number): string {
  return currency.format(cents / 100);
}

// "1234.56" for form fields, without rounding through floats.
export function formatCentsForInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${Math.floor(absolute / 100)}.${fraction}`;
}
