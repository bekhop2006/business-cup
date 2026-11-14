import { en, type Dictionary } from "./en";
import { kk } from "./kk";
import { ru } from "./ru";
import type { Locale } from "./locales";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, kk };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

// Server messages are written in English in the code (and tested there);
// this shows them in the reader's language when a translation exists.
export function translateMessage(locale: Locale, message: string | undefined): string | undefined {
  if (!message) return message;
  return DICTIONARIES[locale].messages[message as keyof Dictionary["messages"]] ?? message;
}
