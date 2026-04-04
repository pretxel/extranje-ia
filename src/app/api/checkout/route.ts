import { auth, currentUser } from "@clerk/nextjs/server";
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
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@pending.local`;
    user = await prisma.user.create({
      data: { clerkId: userId, email, plan: "free", queriesUsed: 0 },
    });
  }

  let paymentLink: Awaited<ReturnType<typeof stripe.paymentLinks.create>>;
  try {
    paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: STRIPE_PRICES[plan], quantity: 1 }],
      after_completion: {
        type: "redirect",
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chat?upgraded=true` },
      },
      metadata: { plan },
    });
  } catch (err) {
    console.error("[checkout] stripe.paymentLinks.create failed:", err);
    return new Response("Failed to create payment link", { status: 500 });
  }

  const url = new URL(paymentLink.url);
  url.searchParams.set("prefilled_email", user.email);
  url.searchParams.set("client_reference_id", userId);

  return Response.json({ url: url.toString() });
}
