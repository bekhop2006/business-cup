import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/db/auth";
import { authenticate } from "./actions";
import styles from "@/app/product.module.css";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/visits");

  return (
    <div className={styles.surface}>
      <main className={styles.login}>
        <div className={styles.loginIntro}>
          <Link href="/" className={styles.brand} aria-label="Recheck home">
            Recheck <span aria-hidden="true">↗</span>
          </Link>
          <h1>Your paperwork.<br />A clearer picture.</h1>
          <p>
            Keep your family&apos;s medical bills together, understand the
            charges, and prepare your next conversation with the billing office.
          </p>
        </div>
        <section className={styles.loginCard} aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-2xl font-semibold">Let&apos;s get started</h2>
          <p className="mt-2 text-sm text-slate-600">
            Log in, or create an account with your email and a password.
          </p>
          <LoginForm action={authenticate} />
          <p className="mt-6 text-xs leading-relaxed text-slate-600">
            Recheck helps explain billing documents. It does not give legal
            or medical advice.
          </p>
        </section>
      </main>
    </div>
  );
}
import Link from "next/link";
