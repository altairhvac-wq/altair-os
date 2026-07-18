import type { SaasPlanKey } from "@/lib/saas-billing/types";

/** Client-safe plan labels (no server env / Stripe secrets). */
export const SAAS_PLAN_LABELS: Record<SaasPlanKey, string> = {
  beta: "Beta",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};
