"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n/locales";

// EN · RU · ҚАЗ. The choice is a cookie, so server pages render in it.
export function LanguageSwitcher({ current, label, tone = "light" }: { current: Locale; label: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };

  return (
    <div role="group" aria-label={label} aria-busy={pending} className="inline-flex items-center gap-1 text-sm">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          onClick={() => choose(locale)}
          className={`min-h-9 rounded-full px-2.5 transition-colors ${
            tone === "dark"
              ? "text-[var(--rc-ivory)]/70 hover:text-[var(--rc-ivory)] aria-pressed:bg-[var(--rc-ivory)]/15 aria-pressed:text-[var(--rc-ivory)]"
              : "text-[var(--rc-navy)]/65 hover:text-[var(--rc-navy)] aria-pressed:bg-[var(--rc-navy)]/8 aria-pressed:text-[var(--rc-navy)]"
          }`}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </div>
  );
}
