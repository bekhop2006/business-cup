"use client";

import { useActionState } from "react";
import type { LoginState } from "@/app/(auth)/login/actions";

type Props = {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
};

export function LoginForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} aria-busy={pending} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-slate-900">
          {state.message}
        </p>
      )}
      {pending && (
        <p role="status" className="text-sm text-slate-600">
          Connecting to your account…
        </p>
      )}

      <button
        name="intent"
        value="login"
        disabled={pending}
        className="rounded-lg bg-[var(--rc-accent)] px-4 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        Log in
      </button>
      <button
        name="intent"
        value="signup"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:opacity-60"
      >
        Create an account
      </button>
    </form>
  );
}
