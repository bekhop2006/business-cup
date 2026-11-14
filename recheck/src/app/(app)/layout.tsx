import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/login/actions";
import { getCurrentUser } from "@/lib/db/auth";
import { AppNavigation } from "@/components/AppNavigation";
import styles from "@/app/product.module.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className={styles.surface}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/visits" className={styles.brand}>
            Recheck
          </Link>
          <nav aria-label="Your account" className={styles.navigation}>
            <AppNavigation />
            <form action={signOut}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main-content" className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        Recheck explains medical bills and helps you ask questions about them. It does not give
        legal or medical advice.
      </footer>
    </div>
  );
}
