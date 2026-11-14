"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNavigation() {
  const pathname = usePathname();
  const inVisits = pathname.startsWith("/visits") || pathname.startsWith("/documents");

  return (
    <>
      <Link href="/care/new" aria-current={pathname.startsWith("/care") ? "page" : undefined}>
        Get care
      </Link>
      <Link href="/visits" aria-current={inVisits ? "page" : undefined}>
        Your visits
      </Link>
      <Link href="/upload" aria-current={pathname === "/upload" ? "page" : undefined}>
        Add a document
      </Link>
      <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>
        Your year
      </Link>
      <Link href="/billing" aria-current={pathname === "/billing" ? "page" : undefined}>
        Plan
      </Link>
      <Link href="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>
        Profile
      </Link>
    </>
  );
}
