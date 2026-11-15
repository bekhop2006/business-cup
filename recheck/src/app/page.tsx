import Link from "next/link";
import { startDemo } from "@/app/actions/demo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/db/auth";
import { fill } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { HOME_PATH } from "@/lib/routes";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { formatCents } from "@/lib/money";
import styles from "./home.module.css";

export default async function Home() {
  // The landing stays open after login; signed-in visitors get a way back
  // to their dashboard instead of the login link.
  const user = await getCurrentUser();
  const startHref = user ? HOME_PATH : "/login";
  const { locale, t } = await getT();
  const l = t.landing;

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">
        {t.common.skipToContent}
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={l.homeLabel}>
          <span className={styles.brandMark} aria-hidden="true">
            ✓
          </span>
          Recheck
        </Link>
        <nav aria-label={l.mainNav} className={styles.nav}>
          <LanguageSwitcher current={locale} label={t.common.languageLabel} tone="dark" />
          <a className={styles.howLink} href="#how-it-works">
            {l.howItWorks}
          </a>
          <Link href={startHref}>
            {user ? l.myDashboard : l.logIn} <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div>
            <p className={styles.eyebrow}>{l.eyebrow}</p>
            <h1 id="hero-heading">
              {l.titleLine1}<br />
              <span>{l.titleLine2}</span>
            </h1>
            <p className={styles.intro}>{l.intro}</p>
            <div className={styles.heroActions}>
              <Link href={startHref} className={styles.primaryLink}>
                {l.cta} <span aria-hidden="true">↗</span>
              </Link>
              {!user && (
                <form action={startDemo}>
                  <button className={styles.demoButton}>{l.demoCta}</button>
                </form>
              )}
            </div>
            <p className={styles.helper}>{l.helper}{!user && ` ${l.demoHelper}`}</p>
          </div>

          <aside className={styles.checklist} aria-label={l.methodLabel}>
            <div className={styles.sheetHeading}>
              <span className={styles.eyebrow}>{l.method}</span>
              <span className={styles.documentMark} aria-hidden="true">R.</span>
            </div>
            <h2>
              {l.methodTitleLine1}<br />
              {l.methodTitleLine2}
            </h2>
            <ul>
              {l.methodItems.map((item, index) => (
                <li key={item}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span> {index === 2 ? <span className="rc-mark">{item}</span> : item}
                </li>
              ))}
            </ul>
            <p className={styles.sheetNote}>
              <span className={styles.attentionLabel}>{l.realPricesLabel}</span>
              {l.realPrices}
            </p>
          </aside>
        </section>

        <section
          id="how-it-works"
          className={styles.stepsSection}
          aria-labelledby="steps-heading"
        >
          <p className={styles.eyebrow}>{l.stepsEyebrow}</p>
          <h2 id="steps-heading">{l.stepsTitleLine1}<br />{l.stepsTitleLine2}</h2>
          <ol className={styles.steps}>
            {l.steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")} /
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.questions} aria-labelledby="questions-heading">
          <div>
            <p className={styles.eyebrow}>{l.faqEyebrow}</p>
            <h2 id="questions-heading">
              {l.faqTitleLine1}<br />{l.faqTitleLine2}
            </h2>
          </div>
          <div className={styles.answers}>
            {l.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <div>
            <p className={styles.eyebrow}>{fill(l.ctaEyebrow, { plan: PAID_PLAN_NAME, price: formatCents(MONTHLY_PRICE_CENTS) })}</p>
            <h2 id="cta-heading">{l.ctaTitle}</h2>
          </div>
          <Link href={startHref} className={styles.primaryLink}>
            {l.cta} <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>Recheck</span>
        <p>{t.common.footer}</p>
      </footer>
    </div>
  );
}
