"use server";

import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/db/admin";
import { createServerSupabase } from "@/lib/db/supabase";
import { env } from "@/lib/env";
import { HOME_PATH } from "@/lib/routes";

// Opens the shared demo account (Michael) without a password: the server
// issues a one-time sign-in token for DEMO_EMAIL and redeems it at once.
// No password is stored anywhere.
export async function startDemo() {
  if (!env.DEMO_EMAIL) redirect("/login?demo=unavailable");
  const { data, error } = await createAdminSupabase().auth.admin.generateLink({
    type: "magiclink",
    email: env.DEMO_EMAIL,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) redirect("/login?demo=unavailable");
  const { error: verifyError } = await (await createServerSupabase()).auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) redirect("/login?demo=unavailable");
  redirect(HOME_PATH);
}
