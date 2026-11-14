import { describe, expect, it } from "vitest";
import { getDictionary, translateMessage } from "@/lib/i18n/dictionaries";
import { en } from "@/lib/i18n/en";
import { fill, LOCALES, parseLocale } from "@/lib/i18n/locales";

// Every leaf path of a dictionary, with array lengths, so a missing or extra
// string in one language shows up by name.
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`, ...value.flatMap((item, i) => shape(item, `${path}[${i}]`))];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => (key === "messages" ? [] : shape(item, path ? `${path}.${key}` : key)));
  }
  return [path];
}

describe("dictionaries", () => {
  it.each(LOCALES)("%s has exactly the English strings, none empty", (locale) => {
    const dictionary = getDictionary(locale);
    expect(shape(dictionary)).toEqual(shape(en));
    const leaves = JSON.stringify(dictionary).match(/""/g);
    expect(leaves).toBeNull();
  });

  it.each(["ru", "kk"] as const)("%s keeps every placeholder of the English text", (locale) => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    const pairs = (a: unknown, b: unknown): [string, string][] => {
      if (typeof a === "string" && typeof b === "string") return [[a, b]];
      if (a && b && typeof a === "object") {
        return Object.keys(a).flatMap((key) => pairs((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
      }
      return [];
    };
    for (const [english, translated] of pairs(en, getDictionary(locale))) {
      expect(placeholders(translated), translated).toEqual(placeholders(english));
    }
  });

  it("translates server messages, and keeps English or unknown ones as they are", () => {
    expect(translateMessage("ru", "Wrong email or password.")).toBe("Неверный email или пароль.");
    expect(translateMessage("kk", "Wrong email or password.")).toBe("Email немесе құпиясөз қате.");
    expect(translateMessage("en", "Wrong email or password.")).toBe("Wrong email or password.");
    expect(translateMessage("ru", "Something new.")).toBe("Something new.");
    expect(translateMessage("ru", undefined)).toBeUndefined();
  });

  it("has a translation for every message in Russian and Kazakh", () => {
    expect(Object.keys(getDictionary("kk").messages).sort()).toEqual(Object.keys(getDictionary("ru").messages).sort());
  });
});

describe("locale helpers", () => {
  it("falls back to English for a missing or unknown cookie", () => {
    expect(parseLocale("ru")).toBe("ru");
    expect(parseLocale("kk")).toBe("kk");
    expect(parseLocale("de")).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fill("Step {n} of {total}", { n: 1, total: 3 })).toBe("Step 1 of 3");
    expect(fill("{used} of {limit}", { used: "$300.00" })).toBe("$300.00 of {limit}");
  });
});
