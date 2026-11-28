import type { SaasPlanKey } from "@/lib/saas-billing/types";

/**
 * Public pricing-page positioning copy for each catalog plan.
 * Keep in sync with PricingPageView — single source for plan-tier framing.
 */
export const SAAS_PLAN_DESCRIPTIONS: Record<SaasPlanKey, string> = {
  beta: "",
  starter: "For an owner-operator running the business on their own.",
  growth:
    "For a growing shop: the owner, the office and a few technicians.",
  pro: "For established shops running several crews.",
};
