import { NextResponse, type NextRequest } from "next/server";
import { getPaidCheckoutUserId } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/db/auth";
import { setPlan } from "@/lib/db/profiles";
import { env } from "@/lib/env";

// Stripe sends the person here after paying. The webhook also upgrades the
// plan; checking the session here means it doesn't matter which comes first.
export async function GET(request: NextRequest) {
  // Redirects use APP_URL: behind Railway's proxy the request URL carries the
  // internal address (localhost:8080), not the public one.
  const billing = new URL("/billing", env.APP_URL);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.APP_URL));

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.redirect(billing);

  try {
    const paidUserId = await getPaidCheckoutUserId(sessionId);
    if (paidUserId === user.id) {
      await setPlan(createAdminSupabase(), user.id, "paid");
      billing.searchParams.set("upgraded", "1");
    }
  } catch {
    console.error("Confirming checkout failed", { userId: user.id });
  }
  return NextResponse.redirect(billing);
}
