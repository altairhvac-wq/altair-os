import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { formatDateInTimeZone } from "@/shared/lib/datetime";

export type SubscriptionBillingBannerTone = "info" | "warning" | "error";

export type SubscriptionBillingBannerModel = {
  tone: SubscriptionBillingBannerTone;
  title: string;
  /** Compact top-bar label (e.g. "Trial ends Aug 13, 2026"). */
  shortLabel: string;
  /** Fuller context for tooltip / accessible description. */
  description: string;
  showManageAction: boolean;
  /** Semantic role for the notice region. */
  role: "alert" | "status";
};

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Company-timezone formatting, NOT toLocaleDateString: this banner
  // server-renders on every page, and a timezone-naive format made the
  // server (UTC) say "Aug 14" while the client (local) said "Aug 13" —
  // a text mismatch that threw React hydration error #418 on every load.
  return formatDateInTimeZone(date, undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Derives a single soft-enforcement notice from the authoritative billing
 * resolver result. Returns null when no shell notice should render.
 */
export function getSubscriptionBillingBannerModel(
  access: CompanyBillingAccess,
  canManageBilling: boolean,
): SubscriptionBillingBannerModel | null {
  const trialEnds = formatDateLabel(access.trialEndsAt);
  const graceEnds = formatDateLabel(access.graceEndsAt);

  switch (access.state) {
    case "TRIAL": {
      // The resolver can still report TRIAL after `trialEndsAt` has passed
      // (the state only moves when billing is re-evaluated), which left the
      // shell promising "Trial ends Aug 13" for weeks after Aug 13.
      //
      // `trialHasEnded` is decided on the server and serialized with the rest
      // of `access`. This function runs inside a "use client" banner, so it
      // must NOT read the clock itself — server and client would evaluate it
      // at different instants and render different text on either side of the
      // trial boundary, which React reports as a hydration mismatch.
      if (access.trialHasEnded && trialEnds) {
        return {
          tone: "warning",
          title: "Trial ended",
          shortLabel: `Trial ended ${trialEnds}`,
          description: canManageBilling
            ? `Your free trial ended ${trialEnds}. Add a payment method in Settings → Billing to keep full access.`
            : `Your company's free trial ended ${trialEnds}. An owner or admin can add a payment method.`,
          showManageAction: canManageBilling,
          role: "status",
        };
      }

      // The card-free trial's payment prompt (day 10 onward, no card on
      // file). `trialEndingSoon` is decided on the server for the same
      // hydration reason as `trialHasEnded`.
      if (access.trialEndingSoon && !access.hasStripeSubscription) {
        return {
          tone: "warning",
          title: "Add a payment method",
          shortLabel: trialEnds
            ? `Trial ends ${trialEnds} · add a card`
            : "Trial ending soon · add a card",
          description: canManageBilling
            ? trialEnds
              ? `Your free trial ends ${trialEnds}. Add a payment method in Settings → Billing to keep access — you won't be charged until the trial ends.`
              : "Your free trial ends soon. Add a payment method in Settings → Billing to keep access."
            : trialEnds
              ? `Your company's free trial ends ${trialEnds}. An owner or admin can add a payment method to keep access.`
              : "Your company's free trial ends soon. An owner or admin can add a payment method.",
          showManageAction: canManageBilling,
          role: "status",
        };
      }

      return {
        tone: "info",
        title: "Trial period",
        shortLabel: trialEnds ? `Trial ends ${trialEnds}` : "Trial in progress",
        description: canManageBilling
          ? trialEnds
            ? access.hasStripeSubscription
              ? `Your company is on a free trial that ends ${trialEnds}. Billing starts then on your chosen plan.`
              : `Your company is on a free trial that ends ${trialEnds}. Add a payment method any time in Settings → Billing.`
            : "Your company is on a free trial. Add a payment method any time in Settings → Billing."
          : trialEnds
            ? `Your company is on a trial period that ends ${trialEnds}.`
            : "Your company is currently on a trial period.",
        showManageAction: canManageBilling,
        role: "status",
      };
    }

    case "GRACE":
      return {
        tone: "warning",
        title: "Payment past due",
        shortLabel: graceEnds
          ? `Payment past due · until ${graceEnds}`
          : "Payment past due",
        description: canManageBilling
          ? graceEnds
            ? `Payment is past due. Full access continues until ${graceEnds}.`
            : "Payment is past due. Full access continues during the grace period."
          : "Your company subscription needs attention. An owner or admin can update billing.",
        showManageAction: canManageBilling,
        role: "status",
      };

    case "LIMITED":
      return {
        tone: "warning",
        title: "Limited access",
        shortLabel: "Limited access",
        description: canManageBilling
          ? graceEnds
            ? `Payment is past due and the grace period ended ${graceEnds}. Billing may limit operational changes.`
            : "Payment is past due and the grace period has ended. Billing may limit operational changes."
          : "Your company subscription is limited. An owner or admin can update billing.",
        showManageAction: canManageBilling,
        role: "alert",
      };

    case "READ_ONLY":
      return {
        tone: "warning",
        title: "Read-only billing state",
        shortLabel: "Read-only billing",
        description: canManageBilling
          ? "Subscription payment is unpaid. The workspace is in a read-only billing posture."
          : "Your company workspace is in a read-only billing state. An owner or admin can update billing.",
        showManageAction: canManageBilling,
        role: "alert",
      };

    case "BLOCKED":
      return {
        tone: "error",
        title: "Subscription inactive",
        shortLabel: "Subscription inactive",
        description: canManageBilling
          ? "This company's subscription is inactive. Renew or contact support to restore access."
          : "Your company subscription is inactive. An owner or admin can restore access.",
        showManageAction: canManageBilling,
        role: "alert",
      };

    case "ACTIVE":
      if (access.isComped) {
        return {
          tone: "info",
          title: "Closed beta access",
          shortLabel: "Closed beta access",
          description: canManageBilling
            ? "This company has complimentary access during the closed beta. No paid subscription is required right now."
            : "Your company is using Altair Operating System with complimentary closed beta access.",
          showManageAction: false,
          role: "status",
        };
      }
      return null;

    default:
      return null;
  }
}
