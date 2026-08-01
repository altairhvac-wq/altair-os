import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";

export type MissionControlUpgradeCardVariant =
  | "beta_comped"
  | "trial"
  | "explore_pro"
  | "on_pro";

export type MissionControlUpgradeCardModel = {
  variant: MissionControlUpgradeCardVariant;
  /** Section header above the card body. */
  sectionTitle: string;
  headline: string;
  description: string;
  /** Null when the card is status-only (no CTA). */
  href: string | null;
  /** Brass/CTA chrome vs quiet plan status. */
  emphasis: "cta" | "quiet";
};

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Same formatter as subscription-billing-banner-model (banner shortLabel).
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

/**
 * Derives Mission Control Upgrade card content from the same
 * CompanyBillingAccess the shell trial/billing banner uses.
 */
export function getMissionControlUpgradeCardModel(
  access: CompanyBillingAccess,
): MissionControlUpgradeCardModel {
  // 1. Closed beta / complimentary — settings copy verbatim.
  if (access.isComped) {
    return {
      variant: "beta_comped",
      sectionTitle: "Plan",
      headline: "Closed beta access",
      description: "Complimentary access — no billing required.",
      href: "/settings/subscription",
      emphasis: "quiet",
    };
  }

  // 2. Active trial with an end date — align date with banner shortLabel.
  if (access.status === "trialing" && access.trialEndsAt) {
    const trialEnds = formatDateLabel(access.trialEndsAt);
    const daysLeft = trialDaysRemaining(access.trialEndsAt);
    const daysLine =
      daysLeft != null
        ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`
        : null;

    return {
      variant: "trial",
      sectionTitle: "Trial",
      headline: trialEnds ? `Trial ends ${trialEnds}` : "Trial in progress",
      description: daysLine ?? "Billing begins after the trial period ends.",
      href: "/settings/subscription",
      emphasis: "quiet",
    };
  }

  // 3. Top tier — quiet status slot, no upsell CTA.
  if (access.planKey === "pro") {
    return {
      variant: "on_pro",
      sectionTitle: "Plan",
      headline: "On the Pro plan",
      description: "",
      href: null,
      emphasis: "quiet",
    };
  }

  // 4. Paid lower tiers — plan-tier framing only (no entitlement claims).
  if (access.planKey === "starter" || access.planKey === "growth") {
    return {
      variant: "explore_pro",
      sectionTitle: "Upgrade",
      headline: "Explore Pro",
      description: SAAS_PLAN_DESCRIPTIONS.pro,
      href: "/pricing",
      emphasis: "cta",
    };
  }

  // Internal / unexpected plan keys — keep the row slot quiet, no upsell claims.
  return {
    variant: "on_pro",
    sectionTitle: "Plan",
    headline: "Subscription",
    description: "",
    href: "/settings/subscription",
    emphasis: "quiet",
  };
}
