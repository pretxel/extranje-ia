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
      const clerkUserId = session.metadata?.clerkUserId;
      const plan = session.metadata?.plan;
      if (clerkUserId && plan) {
        await prisma.user.updateMany({
          where: { clerkId: clerkUserId },
          data: { plan },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const clerkUserId = subscription.metadata?.clerkUserId;
      if (clerkUserId) {
        await prisma.user.updateMany({
          where: { clerkId: clerkUserId },
          data: { plan: "free" },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const clerkUserId = subscription.metadata?.clerkUserId;
      const plan = subscription.metadata?.plan;
      if (clerkUserId && plan) {
        await prisma.user.updateMany({
          where: { clerkId: clerkUserId },
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
