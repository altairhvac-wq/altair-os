import type { MissionControlV2ActivityRow } from "@/shared/components/dashboard/mission-control-v2/sample-data";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  getOperationalActivityHref,
  type OperationalActivity,
  type OperationalActivityEventType,
} from "@/shared/types/operational-activity";
import { formatNotificationTimestamp } from "@/shared/types/notification";

/** Matches the mockup density (5 rows); full feed is not a dedicated page yet. */
export const MISSION_CONTROL_V2_ACTIVITY_PREVIEW_LIMIT = 5;

function resolveActivityTone(
  eventType: OperationalActivityEventType,
): MissionControlV2ActivityRow["tone"] {
  switch (eventType) {
    case "payment_recorded":
    case "invoice_paid":
    case "estimate_approved":
    case "work_completed":
    case "expense_approved":
    case "expense_reimbursed":
    case "estimate_converted_to_invoice":
    case "customer_restored":
    case "customer_restored_from_trash":
      return "success";
    case "estimate_declined":
    case "expense_rejected":
    case "invoice_voided":
    case "invoice_cancelled":
    case "estimate_cancelled":
    case "customer_deleted":
    case "customer_permanently_deleted":
      return "danger";
    case "estimate_sent":
    case "invoice_sent":
    case "expense_submitted":
      return "warning";
    default:
      return "neutral";
  }
}

function formatActivityAmount(
  activity: OperationalActivity,
  canViewBilling: boolean,
): string | undefined {
  if (!canViewBilling) {
    return undefined;
  }

  const amount = activity.metadata.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return undefined;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Prefer a detail line without a duplicated currency when amount is shown
 * separately (payment_recorded / invoice_paid often put amount first).
 */
function buildActivityDetail(
  activity: OperationalActivity,
  canViewBilling: boolean,
  amountLabel: string | undefined,
): string {
  const details = formatOperationalActivityDetailsForAccess(
    activity,
    canViewBilling,
  );

  if (!details) {
    return activity.metadata.customer_name?.trim() || "—";
  }

  if (amountLabel && details.startsWith(amountLabel)) {
    const withoutAmount = details
      .slice(amountLabel.length)
      .replace(/^\s*·\s*/, "")
      .trim();
    return withoutAmount || activity.metadata.customer_name?.trim() || "—";
  }

  return details;
}

function mapActivityToRow(
  activity: OperationalActivity,
  access: DashboardData["access"],
): MissionControlV2ActivityRow {
  const amount = formatActivityAmount(activity, access.canViewBilling);

  return {
    id: activity.id,
    title: formatOperationalActivityLabelForAccess(
      activity,
      access.canViewBilling,
    ),
    detail: buildActivityDetail(activity, access.canViewBilling, amount),
    timestamp: formatNotificationTimestamp(activity.createdAt),
    amount,
    tone: resolveActivityTone(activity.eventType),
    href:
      getOperationalActivityHref(activity, {
        canViewBilling: access.canViewBilling,
        canManageCustomers: access.canManageCustomers,
      }) ?? undefined,
    source: activity.source,
    eventType: activity.eventType,
  };
}

/**
 * Maps getDashboardData.recentActivity into Mission Control v2
 * "Recent activity" rows. Reuses the same merged operational feed as
 * MissionControlActivityTimelineSection (job / estimate / invoice /
 * expense / customer activity tables).
 */
export function buildMissionControlV2ActivityRows(
  data: DashboardData,
  options?: { limit?: number },
): MissionControlV2ActivityRow[] {
  const limit = options?.limit ?? MISSION_CONTROL_V2_ACTIVITY_PREVIEW_LIMIT;

  return data.recentActivity
    .slice(0, limit)
    .map((activity) => mapActivityToRow(activity, data.access));
}
