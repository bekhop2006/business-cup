"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Home · Get care · Ask · Bills · Plan, plus the profile with the insurance details.
export function AppNavigation({ t }: { t: Dictionary["nav"] }) {
  const pathname = usePathname();
  const current = (active: boolean) => (active ? "page" : undefined);
  const inBills =
    pathname.startsWith("/visits") || pathname.startsWith("/documents") || pathname === "/upload";

  return (
    <>
      <Link href="/home" aria-current={current(pathname === "/home" || pathname === "/dashboard")}>
        {t.home}
      </Link>
      <Link href="/care/new" aria-current={current(pathname.startsWith("/care"))}>
        {t.getCare}
      </Link>
      <Link href="/ask" aria-current={current(pathname === "/ask")}>
        {t.ask}
      </Link>
      <Link href="/visits" aria-current={current(inBills)}>
        {t.bills}
      </Link>
      <Link href="/billing" aria-current={current(pathname === "/billing")}>
        {t.plan}
      </Link>
      <Link href="/profile" aria-current={current(pathname === "/profile")}>
        {t.profile}
      </Link>
    </>
  );
}
