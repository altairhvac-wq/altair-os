import type { CompanyBillingAccess } from "@/lib/saas-billing/types";

export type SubscriptionBillingBannerTone = "info" | "warning" | "error";

export type SubscriptionBillingBannerModel = {
  tone: SubscriptionBillingBannerTone;
  title: string;
  description: string;
  showManageAction: boolean;
  /** Semantic role for the banner region. */
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

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Derives a single soft-enforcement banner from the authoritative billing
 * resolver result. Returns null when no shell banner should render.
 */
export function getSubscriptionBillingBannerModel(
  access: CompanyBillingAccess,
  canManageBilling: boolean,
): SubscriptionBillingBannerModel | null {
  const trialEnds = formatDateLabel(access.trialEndsAt);
  const graceEnds = formatDateLabel(access.graceEndsAt);

  switch (access.state) {
    case "TRIAL":
      return {
        tone: "info",
        title: "Trial period",
        description: canManageBilling
          ? trialEnds
            ? `Your company is on a free trial that ends ${trialEnds}.`
            : "Your company is on a free trial."
          : trialEnds
            ? `Your company is on a trial period that ends ${trialEnds}.`
            : "Your company is currently on a trial period.",
        showManageAction: canManageBilling,
        role: "status",
      };

    case "GRACE":
      return {
        tone: "warning",
        title: "Payment past due",
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
          title: "Complimentary beta access",
          description: canManageBilling
            ? "This company has complimentary beta access. No paid subscription is required right now."
            : "Your company is using Altair OS with complimentary beta access.",
          showManageAction: canManageBilling,
          role: "status",
        };
      }
      return null;

    default:
      return null;
  }
}
