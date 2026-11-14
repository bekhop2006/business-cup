// Interface languages. AI output (summaries, explanations, letters) stays in
// English: letters go to US providers and insurers.
export const LOCALES = ["en", "ru", "kk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "rc-lang";

// Short names for the switcher, each in its own language.
export const LOCALE_NAMES: Record<Locale, string> = { en: "EN", ru: "RU", kk: "ҚАЗ" };

// Full names for the language menu, each in its own language.
export const LOCALE_FULL_NAMES: Record<Locale, string> = { en: "English", ru: "Русский", kk: "Қазақша" };

// BCP 47 tags for <html lang> and Intl formatting.
export const LOCALE_TAGS: Record<Locale, string> = { en: "en-US", ru: "ru-RU", kk: "kk-KZ" };

export function parseLocale(value: string | undefined | null): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}

// "Step {n} of {total}" + { n: 1, total: 3 } -> "Step 1 of 3".
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
