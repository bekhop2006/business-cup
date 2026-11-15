import Link from "next/link";
import { isDemoAccount } from "@/lib/demo";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/login/actions";
import { getCurrentUser } from "@/lib/db/auth";
import { getProfile } from "@/lib/db/profiles";
import { createServerSupabase } from "@/lib/db/supabase";
import { AppNavigation } from "@/components/AppNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getT } from "@/lib/i18n/server";
import styles from "@/app/product.module.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // New accounts set up their profile and insurance first.
  const profile = await getProfile(await createServerSupabase(), user.id);
  if (!profile?.onboarded_at) redirect("/onboarding");
  const { locale, t } = await getT();

  return (
    <div className={styles.surface}>
      <a href="#main-content" className={styles.skipLink}>{t.common.skipToContent}</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            Recheck
          </Link>
          <nav aria-label={t.nav.label} className={styles.navigation}>
            <AppNavigation t={t.nav} />
            <LanguageSwitcher current={locale} label={t.common.languageLabel} />
            <form action={signOut}>
              <button>
                {t.common.logOut}
              </button>
            </form>
          </nav>
        </div>
      </header>
      {isDemoAccount(user.email) && (
        <p role="note" className="border-b border-[var(--rc-navy)]/10 bg-[var(--rc-accent)]/40 px-4 py-2 text-center text-sm text-[var(--rc-navy)]">
          {t.common.demoBanner}
        </p>
      )}
      <main id="main-content" className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        {t.common.footer}
      </footer>
    </div>
  );
}
