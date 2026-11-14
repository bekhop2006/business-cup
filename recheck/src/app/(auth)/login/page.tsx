import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginForm } from "@/components/LoginForm";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/db/auth";
import { HOME_PATH } from "@/lib/routes";
import { authenticate } from "./actions";
import styles from "@/app/product.module.css";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect(HOME_PATH);
  const { locale, t } = await getT();

  return (
    <div className={styles.surface}>
      <main className={styles.login}>
        <div className={styles.loginIntro}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className={styles.brand} aria-label={t.login.homeLabel}>
              Recheck <span aria-hidden="true">↗</span>
            </Link>
            <LanguageSwitcher current={locale} label={t.common.languageLabel} tone="dark" />
          </div>
          <h1>{t.login.titleLine1}<br />{t.login.titleLine2}</h1>
          <p>{t.login.intro}</p>
        </div>
        <section className={styles.loginCard} aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-2xl font-semibold">{t.login.cardTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{t.login.cardText}</p>
          <LoginForm action={authenticate} t={t.login} />
          <p className="mt-6 text-xs leading-relaxed text-slate-600">{t.login.note}</p>
        </section>
      </main>
    </div>
  );
}
