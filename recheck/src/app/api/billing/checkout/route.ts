import { BillingNotConfiguredError, createCheckoutUrl, createCustomer } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/db/auth";
import { getProfile, setStripeCustomerId } from "@/lib/db/profiles";
import { env } from "@/lib/env";

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

// Starts a Stripe Checkout for the paid plan and returns its link.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);

  const admin = createAdminSupabase();
  const profile = await getProfile(admin, user.id);
  if (!profile) return fail("We couldn't find your account. Please log in again.", 404);
  if (profile.plan === "paid") return fail("You're already on Recheck Family.", 409);

  try {
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      customerId = await createCustomer(profile.email, user.id);
      await setStripeCustomerId(admin, user.id, customerId);
    }
    const url = await createCheckoutUrl({ customerId, userId: user.id, appUrl: env.APP_URL });
    return Response.json({ url });
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return fail("Payments aren't set up yet. Please try again later.", 503);
    }
    console.error("Starting checkout failed", { userId: user.id });
    return fail("We couldn't open the payment page. Please try again.", 502);
  }
}
