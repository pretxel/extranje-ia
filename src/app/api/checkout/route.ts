import { getOrCreateUser } from "@/lib/auth/user";
import { paidPlansEnabled } from "@/lib/plans";
import { STRIPE_PRICES, stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!paidPlansEnabled()) {
    return new Response("Paid plans not available yet", { status: 503 });
  }

  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { plan }: { plan: "pro" } = await req.json();

  if (!plan || !(plan in STRIPE_PRICES)) {
    return new Response("Invalid plan", { status: 400 });
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
  url.searchParams.set("client_reference_id", user.supabaseId);

  return Response.json({ url: url.toString() });
}
