import { cookies } from "next/headers";
import { getDictionary, type Dictionary } from "./dictionaries";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./locales";

export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getT(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
