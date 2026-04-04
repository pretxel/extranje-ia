import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required");
if (!process.env.STRIPE_PRICE_PRO) throw new Error("STRIPE_PRICE_PRO is required");

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO,
} as const;
