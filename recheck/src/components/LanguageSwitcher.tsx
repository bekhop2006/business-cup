"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_FULL_NAMES, LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n/locales";

// A small language menu: the button shows the current language, the menu
// lists all three in their own words. The choice is saved as a cookie.
export function LanguageSwitcher({ current, label, tone = "light" }: { current: Locale; label: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = (locale: Locale) => {
    setOpen(false);
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };

  const dark = tone === "dark";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${label}: ${LOCALE_FULL_NAMES[current]}`}
        onClick={() => setOpen(!open)}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm outline-offset-2 transition-colors focus-visible:outline-2 ${
          dark
            ? "text-[var(--rc-ivory)]/80 hover:bg-[var(--rc-ivory)]/10 hover:text-[var(--rc-ivory)] focus-visible:outline-[var(--rc-ivory)]"
            : "text-[var(--rc-navy)]/75 hover:bg-[var(--rc-navy)]/6 hover:text-[var(--rc-navy)] focus-visible:outline-[var(--rc-navy)]"
        } ${pending ? "opacity-60" : ""}`}
      >
        <GlobeIcon />
        <span lang={current}>{LOCALE_NAMES[current]}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          id={menuId}
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-1.5 min-w-40 rounded-xl border border-[var(--rc-navy)]/10 bg-[var(--rc-ivory)] p-1 text-sm text-[var(--rc-navy)] shadow-[0_8px_24px_rgba(20,38,61,0.14)]"
        >
          {LOCALES.map((locale) => (
            <li key={locale}>
              <button
                type="button"
                lang={locale}
                aria-current={locale === current ? "true" : undefined}
                onClick={() => choose(locale)}
                className="flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left transition-colors hover:bg-[var(--rc-navy)]/6 focus-visible:bg-[var(--rc-navy)]/6 focus-visible:outline-none"
              >
                {LOCALE_FULL_NAMES[locale]}
                {locale === current && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" />
      <path d="M1.8 8h12.4M8 1.7c1.8 1.7 2.7 3.8 2.7 6.3S9.8 12.6 8 14.3C6.2 12.6 5.3 10.5 5.3 8S6.2 3.4 8 1.7Z" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true" className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
      <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
