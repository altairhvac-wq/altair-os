import "server-only";

import type {
  CompanySubscriptionRow,
  SaasBillingAccessState,
  SaasSubscriptionStatus,
} from "@/lib/saas-billing/types";

export type NormalizedSubscriptionForPolicy = {
  status: SaasSubscriptionStatus | null;
  accessGrant: CompanySubscriptionRow["access_grant"] | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingPolicyDecision = {
  state: SaasBillingAccessState;
  canUseOperationalFeatures: boolean;
  canMutateOperationalData: boolean;
  canManageBilling: boolean;
  warnings: string[];
  isComped: boolean;
};

function parseTime(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function isInFuture(value: string | null | undefined, nowMs: number): boolean {
  const ms = parseTime(value);
  return ms != null && ms > nowMs;
}

/**
 * Pure policy: maps normalized local subscription data → access state.
 * Does not call Stripe. Phase 1 does not enforce lockouts in the app shell.
 */
export function evaluateBillingPolicy(
  subscription: NormalizedSubscriptionForPolicy | null,
  nowMs: number = Date.now(),
): BillingPolicyDecision {
  if (!subscription) {
    return {
      state: "ACTIVE",
      canUseOperationalFeatures: true,
      canMutateOperationalData: true,
      canManageBilling: true,
      warnings: [],
      isComped: true,
    };
  }

  const isComped = subscription.accessGrant === "beta_comped";
  const warnings: string[] = [];

  if (isComped && (!subscription.status || subscription.status === "active")) {
    return {
      state: "ACTIVE",
      canUseOperationalFeatures: true,
      canMutateOperationalData: true,
      canManageBilling: true,
      warnings,
      isComped: true,
    };
  }

  const status = subscription.status;

  if (status === "trialing" || isInFuture(subscription.trialEndsAt, nowMs)) {
    if (status === "trialing") {
      return {
        state: "TRIAL",
        canUseOperationalFeatures: true,
        canMutateOperationalData: true,
        canManageBilling: true,
        warnings,
        isComped,
      };
    }
  }

  if (status === "active") {
    if (subscription.cancelAtPeriodEnd) {
      warnings.push("Subscription is scheduled to cancel at period end.");
    }

    return {
      state: "ACTIVE",
      canUseOperationalFeatures: true,
      canMutateOperationalData: true,
      canManageBilling: true,
      warnings,
      isComped,
    };
  }

  if (status === "past_due") {
    if (isInFuture(subscription.graceEndsAt, nowMs)) {
      warnings.push("Payment is past due. Access continues during the grace period.");
      return {
        state: "GRACE",
        canUseOperationalFeatures: true,
        canMutateOperationalData: true,
        canManageBilling: true,
        warnings,
        isComped,
      };
    }

    warnings.push("Payment is past due and the grace period has ended.");
    return {
      state: "LIMITED",
      canUseOperationalFeatures: true,
      canMutateOperationalData: false,
      canManageBilling: true,
      warnings,
      isComped,
    };
  }

  if (status === "unpaid" || status === "paused") {
    warnings.push("Subscription payment is unpaid. Operational mutations are restricted.");
    return {
      state: "READ_ONLY",
      canUseOperationalFeatures: true,
      canMutateOperationalData: false,
      canManageBilling: true,
      warnings,
      isComped,
    };
  }

  if (
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "incomplete"
  ) {
    if (isComped) {
      return {
        state: "ACTIVE",
        canUseOperationalFeatures: true,
        canMutateOperationalData: true,
        canManageBilling: true,
        warnings,
        isComped: true,
      };
    }

    warnings.push("Subscription is inactive.");
    return {
      state: "BLOCKED",
      canUseOperationalFeatures: false,
      canMutateOperationalData: false,
      canManageBilling: true,
      warnings,
      isComped: false,
    };
  }

  // Unknown / null status with comped grant falls through to complimentary access.
  if (isComped) {
    return {
      state: "ACTIVE",
      canUseOperationalFeatures: true,
      canMutateOperationalData: true,
      canManageBilling: true,
      warnings,
      isComped: true,
    };
  }

  return {
    state: "BLOCKED",
    canUseOperationalFeatures: false,
    canMutateOperationalData: false,
    canManageBilling: true,
    warnings: ["Subscription status is unknown."],
    isComped: false,
  };
}
