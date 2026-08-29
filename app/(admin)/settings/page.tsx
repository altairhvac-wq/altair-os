import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccessSystemCheck } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import {
  getCompanySubscriptionBillingSummary,
  type CompanySubscriptionBillingSummary,
} from "@/lib/saas-billing";
import {
  buildOnboardingChecklist,
  filterOnboardingChecklistForContext,
} from "@/shared/lib/onboarding-checklist";
import {
  SETTINGS_OVERVIEW_ICONS,
  SettingsOverviewView,
  type OverviewTone,
  type SettingsOverviewAttentionItem,
  type SettingsOverviewReadinessMetric,
  type SettingsOverviewStatusCard,
} from "@/shared/components/settings/SettingsOverviewView";
import {
  PAYMENT_ACCOUNT_STATUS_LABELS,
  buildStripePaymentSettingsSummary,
  type StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";
import {
  formatCompanyStatus,
  type TeamMember,
} from "@/shared/types/team-member";
import type { OnboardingSnapshot } from "@/shared/types/onboarding";

const EMPTY_ONBOARDING_SNAPSHOT: OnboardingSnapshot = {
  teamMemberCount: 0,
  hasInvitedOrActiveTeam: false,
  customerCount: 0,
  leadCount: 0,
  jobCount: 0,
  serviceItemCount: 0,
  estimateCount: 0,
  invoiceCount: 0,
  hasBillingDefaultsConfigured: false,
};

async function loadOnboardingSnapshotSafely(
  companyId: string,
  companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): Promise<OnboardingSnapshot> {
  try {
    return await getOnboardingSnapshot(companyId, companyContext);
  } catch (error) {
    console.error("[SettingsOverviewPage] onboarding snapshot load failed:", error);
    return EMPTY_ONBOARDING_SNAPSHOT;
  }
}

async function loadSubscriptionSummarySafely(
  companyId: string,
): Promise<{
  summary: CompanySubscriptionBillingSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await getCompanySubscriptionBillingSummary(companyId),
    };
  } catch (error) {
    console.error("[SettingsOverviewPage] subscription load failed:", error);
    return {
      summary: null,
      error: "Subscription status unavailable.",
    };
  }
}

async function loadStripePaymentSettingsSafely(
  companyId: string,
): Promise<{
  summary: StripePaymentSettingsSummary | null;
  error?: string;
}> {
  try {
    const account = await getCompanyPaymentAccount(companyId, "stripe");
    return {
      summary: account
        ? buildStripePaymentSettingsSummary({
            provider: account.provider,
            status: account.status,
            chargesEnabled: account.chargesEnabled,
            payoutsEnabled: account.payoutsEnabled,
            onlinePaymentsEnabled: account.onlinePaymentsEnabled,
            providerAccountId: account.providerAccountId,
            onboardingCompletedAt: account.onboardingCompletedAt,
            disabledAt: account.disabledAt,
            lastSyncedAt: account.lastSyncedAt,
            providerMetadata: account.providerMetadata,
          })
        : null,
    };
  } catch (error) {
    console.error("[SettingsOverviewPage] Stripe status load failed:", error);
    return {
      summary: null,
      error: "Payment status unavailable.",
    };
  }
}

function formatShortDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSubscriptionPresentation(
  summary: CompanySubscriptionBillingSummary | null,
  loadError?: string,
): { value: string; meta: string; tone: OverviewTone } {
  if (loadError || !summary) {
    return {
      value: "Unavailable",
      meta: loadError ?? "Could not load plan status.",
      tone: "neutral",
    };
  }

  if (summary.isComped && !summary.hasStripeSubscription) {
    return {
      value: summary.planLabel,
      meta: "Closed beta access",
      tone: "brass",
    };
  }

  const trialEnd = formatShortDate(summary.trialEndsAt);
  const periodEnd = formatShortDate(summary.currentPeriodEndsAt);

  if (summary.status === "trialing" || summary.state === "TRIAL") {
    return {
      value: summary.planLabel,
      meta: trialEnd ? `Trial ends ${trialEnd}` : "Trial in progress",
      tone: "info",
    };
  }

  if (summary.status === "active") {
    return {
      value: summary.planLabel,
      meta: summary.cancelAtPeriodEnd
        ? periodEnd
          ? `Cancels ${periodEnd}`
          : "Canceling at period end"
        : periodEnd
          ? `Renews ${periodEnd}`
          : "Active subscription",
      tone: summary.cancelAtPeriodEnd ? "warning" : "success",
    };
  }

  if (summary.status === "past_due") {
    return {
      value: summary.planLabel,
      meta:
        summary.state === "GRACE"
          ? "In grace period — update billing"
          : "Payment past due",
      tone: summary.state === "GRACE" ? "warning" : "danger",
    };
  }

  if (summary.status === "unpaid") {
    return {
      value: summary.planLabel,
      meta: "Payment required to continue",
      tone: "danger",
    };
  }

  if (summary.status === "canceled" || summary.status === "incomplete_expired") {
    return {
      value: summary.planLabel,
      meta: "Subscription canceled",
      tone: "neutral",
    };
  }

  if (summary.state === "ACTIVE") {
    return {
      value: summary.planLabel,
      meta: "Active access",
      tone: "success",
    };
  }

  if (summary.state === "LIMITED" || summary.state === "READ_ONLY") {
    return {
      value: summary.planLabel,
      meta: "Access is limited",
      tone: "warning",
    };
  }

  return {
    value: summary.planLabel,
    meta: "Review subscription settings",
    tone: "neutral",
  };
}

function getPaymentsPresentation(
  canView: boolean,
  summary: StripePaymentSettingsSummary | null,
  loadError?: string,
): { value: string; meta: string; tone: OverviewTone } {
  if (!canView) {
    return {
      value: "Restricted",
      meta: "Billing access required",
      tone: "neutral",
    };
  }

  if (loadError) {
    return {
      value: "Unavailable",
      meta: loadError,
      tone: "neutral",
    };
  }

  if (!summary) {
    return {
      value: "Not connected",
      meta: "Connect Stripe to collect payments",
      tone: "warning",
    };
  }

  const statusLabel = PAYMENT_ACCOUNT_STATUS_LABELS[summary.status];

  if (summary.status === "active" && summary.chargesEnabled) {
    return {
      value: statusLabel,
      meta: summary.onlinePaymentsEnabled
        ? "Online checkout enabled"
        : "Connected — checkout off",
      tone: summary.onlinePaymentsEnabled ? "success" : "info",
    };
  }

  if (
    summary.status === "restricted" ||
    summary.status === "error" ||
    summary.hasOutstandingStripeRequirements
  ) {
    return {
      value: statusLabel,
      meta: "Stripe needs more information",
      tone: "danger",
    };
  }

  if (summary.status === "pending" || summary.status === "not_connected") {
    return {
      value: statusLabel,
      meta: "Finish Stripe Connect setup",
      tone: "warning",
    };
  }

  if (summary.status === "disabled") {
    return {
      value: statusLabel,
      meta: "Customer payments are disabled",
      tone: "danger",
    };
  }

  return {
    value: statusLabel,
    meta: "Review payment settings",
    tone: "neutral",
  };
}

function getTeamPresentation(members: TeamMember[], loadError?: string): {
  value: string;
  meta: string;
  tone: OverviewTone;
  activeCount: number;
  invitedCount: number;
  suspendedCount: number;
} {
  if (loadError) {
    return {
      value: "Unavailable",
      meta: loadError,
      tone: "neutral",
      activeCount: 0,
      invitedCount: 0,
      suspendedCount: 0,
    };
  }

  const activeCount = members.filter((member) => member.status === "active").length;
  const invitedCount = members.filter((member) => member.status === "invited").length;
  const suspendedCount = members.filter(
    (member) => member.status === "suspended",
  ).length;

  const metaParts = [
    `${activeCount} active`,
    invitedCount > 0 ? `${invitedCount} invited` : null,
    suspendedCount > 0 ? `${suspendedCount} suspended` : null,
  ].filter(Boolean);

  return {
    value: `${members.length} member${members.length === 1 ? "" : "s"}`,
    meta: metaParts.join(" · ") || "No members yet",
    tone:
      suspendedCount > 0 ? "warning" : invitedCount > 0 ? "info" : "success",
    activeCount,
    invitedCount,
    suspendedCount,
  };
}

function buildAttentionItems(input: {
  companyStatus: string;
  billingDefaultsConfigured: boolean;
  subscription: CompanySubscriptionBillingSummary | null;
  paymentsCanView: boolean;
  payments: StripePaymentSettingsSummary | null;
  invitedCount: number;
  suspendedCount: number;
}): SettingsOverviewAttentionItem[] {
  const items: SettingsOverviewAttentionItem[] = [];

  if (input.companyStatus === "suspended") {
    items.push({
      id: "company-suspended",
      title: "Company is suspended",
      description: "Review company status before continuing normal operations.",
      href: "/settings/company",
      tone: "danger",
    });
  }

  if (input.subscription) {
    if (
      input.subscription.status === "past_due" ||
      input.subscription.status === "unpaid"
    ) {
      items.push({
        id: "subscription-payment",
        title: "Altair subscription needs billing attention",
        description:
          input.subscription.state === "GRACE"
            ? "You are in a grace period. Update payment details to avoid interruption."
            : "Update billing to restore full subscription access.",
        href: "/settings/billing",
        tone: "danger",
      });
    } else if (input.subscription.cancelAtPeriodEnd) {
      items.push({
        id: "subscription-canceling",
        title: "Subscription is set to cancel",
        description: "Review your plan if you intended to keep Altair active.",
        href: "/settings/billing",
        tone: "warning",
      });
    }
  }

  if (input.paymentsCanView) {
    if (!input.payments) {
      items.push({
        id: "payments-not-connected",
        title: "Customer payments are not connected",
        description: "Connect Stripe to collect invoice payments online.",
        href: "/settings/billing#customer-payments",
        tone: "warning",
      });
    } else if (
      input.payments.status === "restricted" ||
      input.payments.status === "error" ||
      input.payments.hasOutstandingStripeRequirements
    ) {
      items.push({
        id: "payments-requirements",
        title: "Stripe needs more information",
        description: "Finish outstanding requirements to keep payouts healthy.",
        href: "/settings/billing#customer-payments",
        tone: "danger",
      });
    } else if (
      input.payments.status === "pending" ||
      input.payments.status === "not_connected"
    ) {
      items.push({
        id: "payments-pending",
        title: "Finish Stripe Connect setup",
        description: "Complete onboarding so customers can pay online.",
        href: "/settings/billing#customer-payments",
        tone: "warning",
      });
    } else if (input.payments.status === "disabled") {
      items.push({
        id: "payments-disabled",
        title: "Customer payments are disabled",
        description: "Review Stripe Connect status to restore collection.",
        href: "/settings/billing#customer-payments",
        tone: "danger",
      });
    }
  }

  if (!input.billingDefaultsConfigured) {
    items.push({
      id: "billing-defaults",
      title: "Billing defaults are incomplete",
      description: "Set tax, terms, and notes so invoices stay consistent.",
      href: "/settings/documents",
      tone: "info",
    });
  }

  if (input.suspendedCount > 0) {
    items.push({
      id: "team-suspended",
      title: `${input.suspendedCount} suspended team member${input.suspendedCount === 1 ? "" : "s"}`,
      description: "Review access for anyone who should be active again.",
      href: "/settings/users",
      tone: "warning",
    });
  } else if (input.invitedCount > 0) {
    items.push({
      id: "team-invites",
      title: `${input.invitedCount} pending invitation${input.invitedCount === 1 ? "" : "s"}`,
      description: "Teammates still need to accept their invite.",
      href: "/settings/users",
      tone: "info",
    });
  }

  return items;
}

function buildReadinessMetrics(
  snapshot: OnboardingSnapshot,
): SettingsOverviewReadinessMetric[] {
  return [
    {
      id: "customers",
      label: "Customers",
      value: String(snapshot.customerCount),
      ok: snapshot.customerCount > 0,
    },
    {
      id: "jobs",
      label: "Jobs",
      value: String(snapshot.jobCount),
      ok: snapshot.jobCount > 0,
    },
    {
      id: "price-book",
      label: "Price book items",
      value: String(snapshot.serviceItemCount),
      ok: snapshot.serviceItemCount > 0,
    },
    {
      id: "estimates",
      label: "Estimates",
      value: String(snapshot.estimateCount),
      ok: snapshot.estimateCount > 0,
    },
    {
      id: "invoices",
      label: "Invoices",
      value: String(snapshot.invoiceCount),
      ok: snapshot.invoiceCount > 0,
    },
    {
      id: "billing-defaults",
      label: "Billing defaults",
      value: snapshot.hasBillingDefaultsConfigured ? "Configured" : "Not set",
      ok: snapshot.hasBillingDefaultsConfigured,
    },
  ];
}

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const companyContext = await getActiveCompanyContext();
  const params = await searchParams;

  if (!companyContext) {
    return null;
  }

  if (params.payments === "return" || params.payments === "refresh") {
    redirect(
      `/settings/billing?payments=${params.payments}#customer-payments`,
    );
  }

  const canViewPayments = companyContext.permissions.manageBilling;
  const [
    onboardingSnapshot,
    subscriptionResult,
    membersResult,
    paymentsResult,
  ] = await Promise.all([
    loadOnboardingSnapshotSafely(companyContext.company.id, companyContext),
    loadSubscriptionSummarySafely(companyContext.company.id),
    listCompanyMembers(companyContext.company.id, companyContext),
    canViewPayments
      ? loadStripePaymentSettingsSafely(companyContext.company.id)
      : Promise.resolve({
          summary: null as StripePaymentSettingsSummary | null,
          error: undefined as string | undefined,
        }),
  ]);

  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );
  const company = companyContext.company;
  const location = [company.city, company.state].filter(Boolean).join(", ");
  const team = getTeamPresentation(membersResult.members, membersResult.error);
  const subscription = getSubscriptionPresentation(
    subscriptionResult.summary,
    subscriptionResult.error,
  );
  const payments = getPaymentsPresentation(
    canViewPayments,
    paymentsResult.summary,
    paymentsResult.error,
  );

  const statusCards: SettingsOverviewStatusCard[] = [
    {
      id: "company",
      label: "Company",
      value: formatCompanyStatus(company.status),
      meta: [company.name, location || company.timezone].filter(Boolean).join(" · "),
      href: "/settings/company",
      tone:
        company.status === "active"
          ? "success"
          : company.status === "suspended"
            ? "danger"
            : "info",
      icon: SETTINGS_OVERVIEW_ICONS.company,
    },
    {
      id: "team",
      label: "Users",
      value: team.value,
      meta: team.meta,
      href: "/settings/users",
      tone: team.tone,
      icon: SETTINGS_OVERVIEW_ICONS.team,
    },
    {
      id: "subscription",
      label: "Billing",
      value: subscription.value,
      meta: subscription.meta,
      href: "/settings/billing",
      tone: subscription.tone,
      icon: SETTINGS_OVERVIEW_ICONS.subscription,
    },
    {
      id: "payments",
      label: "Customer payments",
      value: payments.value,
      meta: payments.meta,
      href: "/settings/billing#customer-payments",
      tone: payments.tone,
      icon: SETTINGS_OVERVIEW_ICONS.payments,
    },
  ];

  const attentionItems = buildAttentionItems({
    companyStatus: company.status,
    billingDefaultsConfigured: onboardingSnapshot.hasBillingDefaultsConfigured,
    subscription: subscriptionResult.summary,
    paymentsCanView: canViewPayments,
    payments: paymentsResult.summary,
    invitedCount: team.invitedCount,
    suspendedCount: team.suspendedCount,
  });

  return (
    <SettingsOverviewView
      companyName={company.name}
      statusCards={statusCards}
      attentionItems={attentionItems}
      readinessMetrics={buildReadinessMetrics(onboardingSnapshot)}
      onboardingChecklist={onboardingChecklist}
      companyId={company.id}
      userId={companyContext.user.id}
      showSystemCheck={canAccessSystemCheck(companyContext)}
    />
  );
}
