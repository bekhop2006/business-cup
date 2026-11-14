import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/db/types";

// Service-role client for background work that has no user session
// (document processing after upload, and later email and cron jobs).
// It bypasses row-level security, so every query must filter by user_id.
export function createAdminSupabase() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
