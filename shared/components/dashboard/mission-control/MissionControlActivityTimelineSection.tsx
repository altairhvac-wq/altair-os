import Link from "next/link";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
  getOperationalActivityHref,
} from "@/shared/types/operational-activity";
import type { DashboardData } from "@/shared/types/dashboard";
import { MISSION_CONTROL_SECTION_LABELS } from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";
import { MissionControlInlineEmptyState } from "./MissionControlInlineEmptyState";

type MissionControlActivityTimelineSectionProps = {
  data: DashboardData;
  limit?: number;
};

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
    >
      {activities.length === 0 ? (
        <MissionControlInlineEmptyState
          title="No recent activity"
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

            const body = (
              <div className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatOperationalActivityLabelForAccess(
                      activity,
                      access.canViewBilling,
                    )}
                  </p>
                  {details ? (
                    <p className="mt-1 text-sm text-slate-600">{details}</p>
                  ) : null}
                  {activity.actorName ? (
                    <p className="mt-1 text-xs text-slate-500">
                      by {activity.actorName}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatOperationalActivityTimestamp(activity.createdAt)}
                </time>
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
