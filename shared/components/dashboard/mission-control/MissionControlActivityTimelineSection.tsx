import Link from "next/link";
import {
  Briefcase,
  CreditCard,
  FileText,
  History,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
  getOperationalActivityHref,
  type OperationalActivity,
  type OperationalActivityEventType,
} from "@/shared/types/operational-activity";
import type { DashboardData } from "@/shared/types/dashboard";
import { MISSION_CONTROL_SECTION_LABELS } from "@/shared/lib/dashboard-mission-control";
import {
  altairSemanticIndicatorClass,
  type AltairColorHierarchyTone,
} from "@/shared/design-system/foundation";
import {
  MasterPageSection,
  altairSurfaceListClass,
} from "@/shared/design-system/shell";
import { MissionControlInlineEmptyState } from "./MissionControlInlineEmptyState";

type MissionControlActivityTimelineSectionProps = {
  data: DashboardData;
  limit?: number;
};

function resolveActivityIcon(activity: OperationalActivity): LucideIcon {
  if (activity.eventType === "payment_recorded" || activity.eventType === "invoice_paid") {
    return CreditCard;
  }

  switch (activity.source) {
    case "customer":
      return Users;
    case "job":
      return Briefcase;
    case "estimate":
      return FileText;
    case "invoice":
      return Receipt;
    case "expense":
      return Receipt;
    default:
      return History;
  }
}

/** Color only for meaningful event state — feed stays mostly neutral. */
function resolveActivityTone(
  eventType: OperationalActivityEventType,
): Exclude<AltairColorHierarchyTone, "neutral" | "info"> | null {
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
      return null;
  }
}

export function MissionControlActivityTimelineSection({
  data,
  limit = 8,
}: MissionControlActivityTimelineSectionProps) {
  const { access, recentActivity } = data;
  const activities = recentActivity.slice(0, limit);

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.activityTimeline}
      density="compact"
      headerVariant="spacious"
    >
      {activities.length === 0 ? (
        <MissionControlInlineEmptyState
          icon={<History className="h-4 w-4 text-altair-ink-muted" aria-hidden="true" />}
          title="No recent activity yet"
          description={
            access.canViewBilling
              ? "Invoice, job, and customer events will appear here as work happens."
              : "Job and customer events will appear here as work happens."
          }
        />
      ) : (
        <ol className={altairSurfaceListClass}>
          {activities.map((activity) => {
            const href = getOperationalActivityHref(activity, {
              canViewBilling: access.canViewBilling,
              canManageCustomers: access.canManageCustomers,
            });
            const details = formatOperationalActivityDetailsForAccess(
              activity,
              access.canViewBilling,
            );
            const Icon = resolveActivityIcon(activity);
            const tone = resolveActivityTone(activity.eventType);

            const body = (
              <div className="altair-surface-list-row flex items-start gap-3 py-3.5 sm:py-4">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-altair-paper-subtle text-altair-ink-muted">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {tone ? (
                    <span
                      aria-hidden="true"
                      className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${altairSemanticIndicatorClass[tone]}`}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-altair-ink-on-paper">
                      {formatOperationalActivityLabelForAccess(
                        activity,
                        access.canViewBilling,
                      )}
                    </p>
                    <time className="shrink-0 text-xs text-altair-ink-on-paper-muted">
                      {formatOperationalActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>
                  {details ? (
                    <p className="mt-1 text-sm leading-relaxed text-altair-ink-on-paper-secondary">
                      {details}
                    </p>
                  ) : null}
                  {activity.actorName ? (
                    <p className="mt-1 text-xs text-altair-ink-on-paper-muted">
                      by {activity.actorName}
                    </p>
                  ) : null}
                </div>
              </div>
            );

            return (
              <li key={activity.id}>
                {href ? (
                  <Link href={href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      )}
    </MasterPageSection>
  );
}
