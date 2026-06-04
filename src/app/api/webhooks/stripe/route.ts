import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });

  const body = await req.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Checkout sets client_reference_id to the Supabase user id.
      const supabaseUserId = session.client_reference_id ?? session.metadata?.supabaseUserId;
      const plan = session.metadata?.plan;
      if (supabaseUserId && plan) {
        await prisma.user.updateMany({
          where: { supabaseId: supabaseUserId },
          data: { plan },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const supabaseUserId = subscription.metadata?.supabaseUserId;
      if (supabaseUserId) {
        await prisma.user.updateMany({
          where: { supabaseId: supabaseUserId },
          data: { plan: "free" },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const supabaseUserId = subscription.metadata?.supabaseUserId;
      const plan = subscription.metadata?.plan;
      if (supabaseUserId && plan) {
        await prisma.user.updateMany({
          where: { supabaseId: supabaseUserId },
          data: { plan },
        });
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return Response.json({ received: true });
}
