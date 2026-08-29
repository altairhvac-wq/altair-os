import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";
import { formatDateInTimeZone } from "@/shared/lib/datetime";

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
  // Must go through formatDateInTimeZone, not toLocaleDateString(undefined):
  // this card server-renders, so an unqualified locale resolves to UTC on the
  // server and the viewer's zone in the browser — the off-by-one-day text
  // mismatch that throws a hydration error.
  return formatDateInTimeZone(date, undefined, {
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

    // `trialDaysRemaining` returns null once the end date has passed, so a
    // null `daysLine` with a real end date means the trial is over — say
    // "ended" rather than promising a date already in the past.
    const trialElapsed = daysLine === null && trialEnds !== null;

    return {
      variant: "trial",
      sectionTitle: "Trial",
      headline: trialElapsed
        ? `Trial ended ${trialEnds}`
        : trialEnds
          ? `Trial ends ${trialEnds}`
          : "Trial in progress",
      description: trialElapsed
        ? "Set up billing to keep full access."
        : (daysLine ?? "Billing begins after the trial period ends."),
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
