"use client";

import { useActionState, useState } from "react";
import type { LoginState } from "@/app/(auth)/login/actions";

type Props = {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
};

type Mode = "login" | "signup";

const COPY: Record<Mode, { submit: string; pending: string; switchPrompt: string; switchLabel: string }> = {
  login: {
    submit: "Log in",
    pending: "Logging you in…",
    switchPrompt: "New to Recheck?",
    switchLabel: "Create an account",
  },
  signup: {
    submit: "Create my account",
    pending: "Creating your account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Log in",
  },
};

// One form with two modes, so pressing Enter always does what the button says.
export function LoginForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [mode, setMode] = useState<Mode>("login");
  const copy = COPY[mode];
  // Messages belong to the mode that produced them.
  const shown = state.intent === mode ? state : {};

  return (
    <form action={formAction} aria-busy={pending} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="intent" value={mode} />
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
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
        />
        {mode === "signup" && (
          <span className="text-xs font-normal text-slate-600">At least 8 characters.</span>
        )}
      </label>
      {mode === "signup" && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Confirm password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            onInput={(event) => {
              const field = event.currentTarget;
              const password = field.form?.elements.namedItem("password");
              field.setCustomValidity(
                password instanceof HTMLInputElement && password.value !== field.value
                  ? "The passwords don't match."
                  : "",
              );
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
          />
        </label>
      )}

      {shown.error && (
        <p role="alert" className="text-sm text-red-700">
          {shown.error}{" "}
          {shown.suggest && (
            <button type="button" onClick={() => setMode(shown.suggest!)} className="font-medium underline">
              {shown.suggest === "signup" ? "New to Recheck? Create an account" : "Log in instead"}
            </button>
          )}
        </p>
      )}
      {shown.message && (
        <p role="status" className="text-sm text-slate-900">
          {shown.message}
        </p>
      )}

      <button
        disabled={pending}
        className="rounded-lg bg-[var(--rc-accent)] px-4 py-2 font-medium text-[var(--rc-navy)] disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>

      <p className="text-center text-sm text-slate-600">
        {copy.switchPrompt}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          disabled={pending}
          className="font-medium text-[var(--rc-navy)] underline underline-offset-4"
        >
          {copy.switchLabel}
        </button>
      </p>
    </form>
  );
}
