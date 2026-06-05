import Link from "next/link";
import type { TeamMemberActivityItem } from "@/shared/types/team-member-profile";
import { formatDate } from "@/shared/types/customer";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
  adminListRowClass,
} from "@/shared/lib/admin-density";

type TeamMemberActivityCardProps = {
  activity: TeamMemberActivityItem[];
};

const ACTIVITY_TYPE_LABELS: Record<TeamMemberActivityItem["type"], string> = {
  assigned_job: "Assigned",
  completed_job: "Completed",
  estimate: "Estimate",
  time_entry: "Time",
};

export function TeamMemberActivityCard({
  activity,
}: TeamMemberActivityCardProps) {
  return (
    <section className={adminCardSectionClass}>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        Recent Activity
      </h2>

      {activity.length === 0 ? (
        <div className={adminEmptyWrapClass}>
          <p className="text-sm text-slate-500">
            Recent activity will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activity.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className={adminListRowClass}>
                  <ActivityContent item={item} />
                </Link>
              ) : (
                <div className={adminListRowClass}>
                  <ActivityContent item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityContent({ item }: { item: TeamMemberActivityItem }) {
  return (
    <div className="min-w-0 flex-1 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
          {ACTIVITY_TYPE_LABELS[item.type]}
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {item.label}
        </span>
      </div>
      {item.detail ? (
        <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p>
      ) : null}
      <p className="mt-0.5 text-[11px] text-slate-400">
        {formatDate(item.occurredAt)}
      </p>
    </div>
  );
}
