import Stripe from "stripe";

let _stripe: Stripe | undefined;

function createStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    if (!_stripe) _stripe = createStripe();
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const STRIPE_PRICES = {
  get pro(): string {
    const price = process.env.STRIPE_PRICE_PRO;
    if (!price) throw new Error("STRIPE_PRICE_PRO is required");
    return price;
  },
};
