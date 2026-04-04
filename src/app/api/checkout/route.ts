import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { STRIPE_PRICES, stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { plan }: { plan: "pro" } = await req.json();

  if (!plan || !(plan in STRIPE_PRICES)) {
    return new Response("Invalid plan", { status: 400 });
  }

  // Look up or create user in DB
  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId, email: `${userId}@pending.local`, plan: "free", queriesUsed: 0 },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICES[plan], quantity: 1 }],
    customer_email: user.email,
    metadata: { clerkUserId: userId, plan },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chat?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#precios`,
  });

  return Response.json({ url: session.url });
}
