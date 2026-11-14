"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Remembers the interface language for a year.
export async function setLocale(value: string): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, parseLocale(value), { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}
