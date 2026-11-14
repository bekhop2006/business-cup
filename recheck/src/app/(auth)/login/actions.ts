"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase";

export type LoginState = {
  email?: string;
  error?: string;
  message?: string;
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
  if (!parsed.success) {
    return { email: typedEmail, error: parsed.error.issues[0]?.message };
  }

  const { email, password, intent } = parsed.data;
  const supabase = await createServerSupabase();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { email, error: error.message };
    if (!data.session) {
      return {
        email,
        message: "Check your inbox to confirm your email, then log in.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { email, error: error.message };
  }

  redirect("/visits");
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
