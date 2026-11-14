import Stripe from "stripe";
import { MONTHLY_PRICE_CENTS, PAID_PLAN_NAME } from "@/lib/billing/plan";
import { env } from "@/lib/env";

// The only file that talks to Stripe. Test mode keys only.

let client: Stripe | null = null;

function getStripe(): Stripe {
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { timeout: 20_000, maxNetworkRetries: 1 });
  return client;
}

export async function createCustomer(email: string | null, userId: string): Promise<string> {
  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  return customer.id;
}

// A monthly subscription to the paid plan. The price is defined here, so no
// product has to be set up in the Stripe dashboard first.
export async function createCheckoutUrl(options: {
  customerId: string;
  userId: string;
  appUrl: string;
}): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: options.customerId,
    client_reference_id: options.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: MONTHLY_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: { name: PAID_PLAN_NAME },
        },
      },
    ],
    subscription_data: { metadata: { user_id: options.userId } },
    // The product is for US families: always show and charge US dollars.
    adaptive_pricing: { enabled: false },
    success_url: `${options.appUrl}/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${options.appUrl}/billing?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout link.");
  return session.url;
}

// Reads a finished checkout back from Stripe. Returns the user it was for
// when the subscription is paid for, otherwise null.
export async function getPaidCheckoutUserId(sessionId: string): Promise<string | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const paid = session.status === "complete" && session.payment_status !== "unpaid";
  return paid && session.mode === "subscription" ? session.client_reference_id : null;
}

// Verifies the signature before anything else looks at the event.
export function readWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
