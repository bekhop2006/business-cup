import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/login/actions";
import { getCurrentUser } from "@/lib/db/auth";
import { getProfile } from "@/lib/db/profiles";
import { HOME_PATH } from "@/lib/routes";
import { createServerSupabase } from "@/lib/db/supabase";
import { AppNavigation } from "@/components/AppNavigation";
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

  return (
    <div className={styles.surface}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href={HOME_PATH} className={styles.brand}>
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
        Recheck helps you compare care options, estimate costs and question medical bills. It does
        not give legal or medical advice.
      </footer>
    </div>
  );
}
