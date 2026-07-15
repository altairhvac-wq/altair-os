import { Bell, CheckCircle2, ChevronRight } from "lucide-react";
import { WorkflowRemindersSection } from "@/shared/components/dashboard/WorkflowRemindersSection";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { DashboardData } from "@/shared/types/dashboard";

type NorthStarWorkflowMemoryProps = {
  data: DashboardData;
};

export function NorthStarWorkflowMemory({ data }: NorthStarWorkflowMemoryProps) {
  if (!data.access.canViewBilling) {
    return null;
  }

  const snapshot = data.workflowReminders;
  const groupedKinds = Array.from(
    snapshot.reminders.reduce((groups, reminder) => {
      groups.set(reminder.kindLabel, (groups.get(reminder.kindLabel) ?? 0) + 1);
      return groups;
    }, new Map<string, number>()),
  );

  return (
    <details className="group">
      <summary
        className={`${t.footer} min-h-11 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden`}
      >
        <div aria-hidden="true" className={t.footerTopAccent} />
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-[#D7CDBD]">
              {snapshot.totalActiveCount > 0 ? (
                <Bell className="h-4 w-4" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className={t.eyebrowLight}>Workflow memory</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#FFF8E8]">
                {snapshot.totalActiveCount > 0
                  ? `${snapshot.totalActiveCount} saved follow-up${snapshot.totalActiveCount === 1 ? "" : "s"}`
                  : "No saved follow-ups"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 md:flex">
              {groupedKinds.slice(0, 3).map(([label, count]) => (
                <span
                  key={label}
                  className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-200"
                >
                  {label} · {count}
                </span>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-300">
              {snapshot.visibleCount > 0
                ? `${snapshot.visibleCount} ready to review`
                : "Review"}
            </span>
            <ChevronRight
              className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
          </div>
        </div>
      </summary>

      <div className="mt-2">
        <WorkflowRemindersSection
          snapshot={snapshot}
          canManage={data.access.canViewBilling}
          variant="north-star"
          showHeader={false}
        />
      </div>
    </details>
  );
}
