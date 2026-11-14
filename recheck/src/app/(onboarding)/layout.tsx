import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/product.module.css";
import { getCurrentUser } from "@/lib/db/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <div className={styles.surface}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            Recheck
          </Link>
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        Recheck explains medical costs and helps you ask questions about them. It does not give
        legal or medical advice.
      </footer>
    </div>
  );
}
