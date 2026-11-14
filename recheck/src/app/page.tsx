import Link from "next/link";
import { getCurrentUser } from "@/lib/db/auth";
import { HOME_PATH } from "@/lib/routes";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { formatCents } from "@/lib/money";
import styles from "./home.module.css";

export default async function Home() {
  // The landing stays open after login; signed-in visitors get a way back
  // to their dashboard instead of the login link.
  const user = await getCurrentUser();
  const startHref = user ? HOME_PATH : "/login";

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Recheck home">
          <span className={styles.brandMark} aria-hidden="true">
            ✓
          </span>
          Recheck
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <a className={styles.howLink} href="#how-it-works">
            How it works
          </a>
          <Link href={startHref}>
            {user ? "My dashboard" : "Log in"} <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div>
            <p className={styles.eyebrow}>Before and after the visit</p>
            <h1 id="hero-heading">
              Stop overpaying<br />
              <span>for healthcare.</span>
            </h1>
            <p className={styles.intro}>
              Your AI-powered guide to smarter healthcare spending. Find out
              where to go, who&apos;s nearby and what you&apos;re likely to pay
              with your own insurance, then check the bill when it arrives.
            </p>
            <Link href={startHref} className={styles.primaryLink}>
              Find my savings <span aria-hidden="true">↗</span>
            </Link>
            <p className={styles.helper}>
              Free to start. Your first care question and first bill check are on us.
            </p>
          </div>

          <aside className={styles.checklist} aria-label="What Recheck helps with">
            <div className={styles.sheetHeading}>
              <span className={styles.eyebrow}>The Recheck method</span>
              <span className={styles.documentMark} aria-hidden="true">R.</span>
            </div>
            <h2>
              Every visit deserves<br />
              a second look.
            </h2>
            <ul>
              <li>
                <span aria-hidden="true">01</span> Is it safe to wait, or do I
                need care now?
              </li>
              <li>
                <span aria-hidden="true">02</span> Primary care, a specialist or
                urgent care?
              </li>
              <li>
                <span aria-hidden="true">03</span> What will I pay with my plan?
              </li>
              <li>
                <span aria-hidden="true">04</span> Is my bill right?
              </li>
            </ul>
            <p className={styles.sheetNote}>
              <span className={styles.attentionLabel}>Real prices, clearly labeled</span>
              Estimates start from public Medicare fee schedules and your own
              deductible, copays and coinsurance. Every assumption is shown.
            </p>
          </aside>
        </section>

        <section
          id="how-it-works"
          className={styles.stepsSection}
          aria-labelledby="steps-heading"
        >
          <p className={styles.eyebrow}>From a symptom to a settled bill</p>
          <h2 id="steps-heading">One guide for<br />the whole visit.</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                01 /
              </span>
              <h3>Before the visit</h3>
              <p>
                Describe what&apos;s wrong in your own words. We check warning
                signs first, then explain your options: primary care, a
                specialist or urgent care.
              </p>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                02 /
              </span>
              <h3>Compare costs and providers</h3>
              <p>
                See real providers near you and what a visit, an X-ray or an
                MRI could cost you under your plan, with a checklist of
                questions for the call.
              </p>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                03 /
              </span>
              <h3>After the visit</h3>
              <p>
                Upload the bill and your insurer&apos;s statement. We flag
                possible errors and draft a letter and phone script for you to
                use.
              </p>
            </li>
          </ol>
        </section>

        <section className={styles.questions} aria-labelledby="questions-heading">
          <div>
            <p className={styles.eyebrow}>Before you begin</p>
            <h2 id="questions-heading">
              A few things<br />to know.
            </h2>
          </div>
          <div className={styles.answers}>
            <details>
              <summary>Where do the prices come from?</summary>
              <p>
                From the public Medicare Physician Fee Schedule, with a labeled
                assumption for how much more commercial plans usually pay. Your
                share is calculated from the deductible, copays and coinsurance
                you enter. They are estimates, not quotes from a clinic.
              </p>
            </details>
            <details>
              <summary>Does Recheck know if a provider is in my network?</summary>
              <p>
                No. Every provider is marked &quot;not verified&quot;, and we give
                you the questions to confirm network status with the provider
                and your insurer before you book.
              </p>
            </details>
            <details>
              <summary>What if it&apos;s an emergency?</summary>
              <p>
                If you have a warning sign, Recheck tells you to get care now,
                before anything else. Safety guidance is always free. If you
                think it&apos;s an emergency, call 911.
              </p>
            </details>
            <details>
              <summary>Does a flag mean my bill is wrong?</summary>
              <p>
                A flag identifies something worth checking with your provider or
                insurer. Review the original document and confirm the details
                with them before deciding what to do.
              </p>
            </details>
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <div>
            <p className={styles.eyebrow}>{PAID_PLAN_NAME} · {formatCents(MONTHLY_PRICE_CENTS)} a month</p>
            <h2 id="cta-heading">Know the cost before the visit.</h2>
          </div>
          <Link href={startHref} className={styles.primaryLink}>
            Find my savings <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>Recheck</span>
        <p>
          Recheck helps you compare care options, estimate costs and question
          medical bills. It does not give legal or medical advice.
        </p>
      </footer>
    </div>
  );
}
