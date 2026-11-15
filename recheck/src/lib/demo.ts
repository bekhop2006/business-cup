import { env } from "@/lib/env";

// The shared demo account (DEMO_EMAIL) gets a banner so visitors know that
// others see their changes.
export function isDemoAccount(email: string | null | undefined): boolean {
  return Boolean(env.DEMO_EMAIL && email && email.toLowerCase() === env.DEMO_EMAIL.toLowerCase());
}
