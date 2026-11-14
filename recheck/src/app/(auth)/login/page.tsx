import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/db/auth";
import { authenticate } from "./actions";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/visits");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Recheck</h1>
      <p className="mt-1 text-slate-600">{"Don't pay it. Recheck it."}</p>
      <p className="mt-6 text-sm text-slate-600">
        Log in, or create an account with your email and a password.
      </p>
      <LoginForm action={authenticate} />
    </main>
  );
}
