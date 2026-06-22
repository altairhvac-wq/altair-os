import "server-only";

import Stripe from "stripe";
import { requireStripeSecretKey } from "@/lib/payments/env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireStripeSecretKey(), {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}
