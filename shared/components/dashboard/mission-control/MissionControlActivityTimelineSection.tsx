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
} from "@/shared/types/operational-activity";
import type { DashboardData } from "@/shared/types/dashboard";
import { MISSION_CONTROL_SECTION_LABELS } from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";
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

export function MissionControlActivityTimelineSection({
  data,
  limit = 8,
}: MissionControlActivityTimelineSectionProps) {
  const { access, recentActivity } = data;
  const activities = recentActivity.slice(0, limit);

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.activityTimeline}
      description="Latest operational events, newest first."
      density="compact"
      headerVariant="spacious"
    >
      {activities.length === 0 ? (
        <MissionControlInlineEmptyState
          icon={<History className="h-4 w-4 text-slate-500" aria-hidden="true" />}
          title="No recent activity yet"
          description={
            access.canViewBilling
              ? "Invoice, job, and customer events will appear here as work happens."
              : "Job and customer events will appear here as work happens."
          }
        />
      ) : (
        <ol className="admin-card divide-y divide-slate-100 overflow-hidden">
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

            const body = (
              <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-bold text-slate-900">
                      {formatOperationalActivityLabelForAccess(
                        activity,
                        access.canViewBilling,
                      )}
                    </p>
                    <time className="shrink-0 text-xs text-slate-500">
                      {formatOperationalActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>
                  {details ? (
                    <p className="mt-0.5 text-sm text-slate-600">{details}</p>
                  ) : null}
                  {activity.actorName ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      by {activity.actorName}
                    </p>
                  ) : null}
                </div>
              </div>
            );

            return (
              <li key={activity.id}>
                {href ? (
                  <Link
                    href={href}
                    className="block transition-colors hover:bg-slate-50/80"
                  >
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
