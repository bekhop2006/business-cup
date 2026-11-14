import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/product.module.css";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/db/auth";
import { getT } from "@/lib/i18n/server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { locale, t } = await getT();

  return (
    <div className={styles.surface}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            Recheck
          </Link>
          <LanguageSwitcher current={locale} label={t.common.languageLabel} />
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>{t.common.footer}</footer>
    </div>
  );
}
