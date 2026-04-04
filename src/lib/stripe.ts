import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO!,
} as const;
