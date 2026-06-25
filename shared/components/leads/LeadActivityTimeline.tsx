import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { ls } from "@/shared/components/leads/north-star-m14/lead-north-star-styles";
import {
  formatLeadActivityDetails,
  formatLeadActivityLabel,
  type LeadActivity,
  type LeadActivityType,
} from "@/shared/types/lead-activity";
import { formatLeadDateTime } from "@/shared/types/lead";

type LeadActivityTimelineProps = {
  activities: LeadActivity[];
  timeZone?: string;
  northStar?: boolean;
};

const ACTIVITY_ICONS: Record<LeadActivityType, typeof Sparkles> = {
  lead_created: Sparkles,
  call_logged: Phone,
  email_logged: Mail,
  note_added: MessageSquare,
  status_changed: FileText,
  follow_up_changed: CalendarClock,
  estimate_created: FileText,
  converted: UserPlus,
  won: CheckCircle2,
  lost: CheckCircle2,
};

export function LeadActivityTimeline({
  activities,
  timeZone,
  northStar = false,
}: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className={northStar ? ls.emptyState : "text-sm text-slate-500"}>
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.activityType] ?? MessageSquare;
        const details = formatLeadActivityDetails(activity);

        return (
          <li key={activity.id} className="relative flex gap-3 pb-6">
            {index < activities.length - 1 ? (
              <span
                aria-hidden
                className={
                  northStar
                    ? ls.timelineConnector
                    : "absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200"
                }
              />
            ) : null}

            <div
              className={
                northStar
                  ? ls.timelineIconWrap
                  : "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              }
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={
                    northStar ? ls.timelineTitle : "text-sm font-semibold text-slate-900"
                  }
                >
                  {formatLeadActivityLabel(activity)}
                </p>
                <span
                  className={
                    northStar ? ls.timelineMeta : "text-xs text-slate-500"
                  }
                >
                  {formatLeadDateTime(activity.createdAt, timeZone)}
                </span>
              </div>

              {details ? (
                <p
                  className={
                    northStar ? ls.timelineBody : "mt-1 whitespace-pre-wrap text-sm text-slate-600"
                  }
                >
                  {details}
                </p>
              ) : null}

              {activity.createdByName ? (
                <p
                  className={
                    northStar ? ls.timelineAuthor : "mt-1 text-xs text-slate-500"
                  }
                >
                  {activity.createdByName}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
