import type { SaasPlanKey } from "@/lib/saas-billing/types";

/**
 * Public pricing-page positioning copy for each catalog plan.
 * Keep in sync with PricingPageView — single source for plan-tier framing.
 */
export const SAAS_PLAN_DESCRIPTIONS: Record<SaasPlanKey, string> = {
  beta: "",
  starter: "For owner-operators and small teams building a stronger foundation.",
  growth:
    "For growing service businesses coordinating more people and more work.",
  pro: "For established operations managing multiple crews or locations.",
};
