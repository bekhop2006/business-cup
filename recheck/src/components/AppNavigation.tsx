"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Home · Get care · Bills · Plan, plus the profile with the insurance details.
export function AppNavigation() {
  const pathname = usePathname();
  const current = (active: boolean) => (active ? "page" : undefined);
  const inBills =
    pathname.startsWith("/visits") || pathname.startsWith("/documents") || pathname === "/upload";

  return (
    <>
      <Link href="/home" aria-current={current(pathname === "/home" || pathname === "/dashboard")}>
        Home
      </Link>
      <Link href="/care/new" aria-current={current(pathname.startsWith("/care"))}>
        Get care
      </Link>
      <Link href="/visits" aria-current={current(inBills)}>
        Bills
      </Link>
      <Link href="/billing" aria-current={current(pathname === "/billing")}>
        Plan
      </Link>
      <Link href="/profile" aria-current={current(pathname === "/profile")}>
        Profile
      </Link>
    </>
  );
}
