"use server";

import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/routes";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase";

type Intent = "login" | "signup";

export type LoginState = {
  intent?: Intent;
  email?: string;
  error?: string;
  message?: string;
  // The other form the person probably meant to use.
  suggest?: Intent;
};

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Your password needs at least 8 characters."),
  intent: z.enum(["login", "signup"]),
});

export async function authenticate(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent"),
  });
  // Returned so the form keeps the email after a failed attempt.
  const typedEmail = String(formData.get("email") ?? "");
  const typedIntent: Intent = formData.get("intent") === "signup" ? "signup" : "login";
  if (!parsed.success) {
    return { intent: typedIntent, email: typedEmail, error: parsed.error.issues[0]?.message };
  }

  const { email, password, intent } = parsed.data;
  // Sign-up asks for the password twice; the server checks it too.
  if (intent === "signup" && formData.get("confirmPassword") !== password) {
    return { intent, email, error: "The passwords don't match. Type the same password twice." };
  }
  const supabase = await createServerSupabase();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error?.code === "user_already_exists") {
      return { intent, email, error: "There's already an account with this email.", suggest: "login" };
    }
    if (error) return { intent, email, error: error.message };
    if (!data.session) {
      return {
        intent,
        email,
        message: "Check your inbox to confirm your email, then log in.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === "invalid_credentials") {
      return { intent, email, error: "Wrong email or password.", suggest: "signup" };
    }
    if (error) return { intent, email, error: error.message };
  }

  redirect(HOME_PATH);
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
