import { createServerSupabase } from "@/lib/db/supabase";

export type CurrentUser = {
  id: string;
  email: string | null;
};

// Returns the signed-in user from a verified session, or null.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email ?? null };
}
