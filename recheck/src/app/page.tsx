import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import styles from "./home.module.css";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/visits");

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
          <Link href="/login">
            Log in <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div>
            <p className={styles.eyebrow}>Medical bills. Checked with care.</p>
            <h1 id="hero-heading">
              Don&apos;t pay it.<br />
              <span>Recheck it.</span>
            </h1>
            <p className={styles.intro}>
              Before the next payment, get a clearer picture. Understand your
              medical bills, spot possible mistakes, and prepare the questions
              that matter.
            </p>
            <Link href="/login" className={styles.primaryLink}>
              Check a bill <span aria-hidden="true">↗</span>
            </Link>
            <p className={styles.helper}>
              Start with a PDF or a photo of your bill.
            </p>
          </div>

          <aside className={styles.checklist} aria-label="What Recheck looks for">
            <div className={styles.sheetHeading}>
              <span className={styles.eyebrow}>The Recheck method</span>
              <span className={styles.documentMark} aria-hidden="true">R.</span>
            </div>
            <h2>
              Every charge deserves<br />
              a second look.
            </h2>
            <ul>
              <li>
                <span aria-hidden="true">01</span> Is a service listed twice?
              </li>
              <li>
                <span aria-hidden="true">02</span> Does the bill match your
                insurance statement?
              </li>
              <li>
                <span aria-hidden="true">03</span> Do the line items add up?
              </li>
              <li>
                <span aria-hidden="true">04</span> Is anything unclear?
              </li>
            </ul>
            <p className={styles.sheetNote}>
              <span className={styles.attentionLabel}>Possible issues, clearly marked</span>
              Each flag points back to its document or charge. You can see
              what needs a question, and why.
            </p>
          </aside>
        </section>

        <section
          id="how-it-works"
          className={styles.stepsSection}
          aria-labelledby="steps-heading"
        >
          <p className={styles.eyebrow}>From paperwork to a plan</p>
          <h2 id="steps-heading">From a confusing bill<br />to an informed next step.</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                01 /
              </span>
              <h3>Bring your paperwork</h3>
              <p>
                Upload a bill or an Explanation of Benefits from your insurer.
                Add both to compare them.
              </p>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                02 /
              </span>
              <h3>See what needs a look</h3>
              <p>
                Review the amounts, plain-language explanations, and possible
                issues in one place. Correct anything read incorrectly.
              </p>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                03 /
              </span>
              <h3>Ask with confidence</h3>
              <p>
                Use a draft letter or phone script to ask your provider about
                flagged charges. Review the wording before using it.
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
              <summary>What should I upload?</summary>
              <p>
                A readable PDF or photo of a medical bill or Explanation of
                Benefits (EOB). An EOB shows how your insurer processed a claim.
                Uploading both helps Recheck compare what you are being asked
                to pay.
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
            <details>
              <summary>Will Recheck contact my provider?</summary>
              <p>
                You choose what to send and when to call. Recheck prepares a
                draft letter and phone script for you to review and use yourself.
              </p>
            </details>
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <div>
            <p className={styles.eyebrow}>Start with one bill</p>
            <h2 id="cta-heading">Understand it before your next step.</h2>
          </div>
          <Link href="/login" className={styles.primaryLink}>
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>Recheck</span>
        <p>
          Recheck explains medical bills and helps you ask questions about them.
          It does not give legal or medical advice.
        </p>
      </footer>
    </div>
  );
}
