import { planForSubscriptionStatus } from "@/lib/billing/plan";
import { readWebhookEvent } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/db/admin";
import { findUserIdByStripeCustomer, setPlan } from "@/lib/db/profiles";

// Stripe events that change a plan. The signature is verified before anything
// else; logs keep event types and ids only.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  let event;
  try {
    event = readWebhookEvent(await request.text(), signature);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const customerId = (customer: string | { id: string } | null) =>
    typeof customer === "string" ? customer : (customer?.id ?? null);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.payment_status !== "unpaid" && session.client_reference_id) {
        await setPlan(admin, session.client_reference_id, "paid");
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customer = customerId(subscription.customer);
      const userId =
        subscription.metadata.user_id ??
        (customer ? await findUserIdByStripeCustomer(admin, customer) : null);
      if (userId) {
        const plan =
          event.type === "customer.subscription.deleted"
            ? "free"
            : planForSubscriptionStatus(subscription.status);
        await setPlan(admin, userId, plan);
      }
      break;
    }
  }

  return Response.json({ received: true });
}
