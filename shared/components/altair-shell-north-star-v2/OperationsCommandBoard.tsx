import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  FileText,
  Inbox,
  Receipt,
  Target,
  Truck,
  Users,
} from "lucide-react";
import type { JobInMotion, MoneyStage, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ActionQueueItem, OfficeQueueItem, SystemConnection } from "./sample-data";
import {
  missionOperatingBoardClass,
  missionBoardHeaderClass,
  missionColumnHeaderClass,
  missionEyebrowClass,
  missionRowClass,
  missionMetaClass,
  missionLabelMutedClass,
  missionWorkspaceTitleClass,
  missionWorkspaceHeadingClass,
  missionLinkClass,
} from "./mission-tokens";

const urgencyStyles = {
  now: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)]",
  },
  today: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  },
  soon: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
} as const;

const jobStatusStyles = {
  in_progress: { label: "On site", dot: "bg-cyan-500", text: "text-cyan-700" },
  en_route: { label: "En route", dot: "bg-indigo-500", text: "text-indigo-700" },
  scheduled: { label: "Scheduled", dot: "bg-slate-400", text: "text-slate-600" },
  completed: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
} as const;

const techStateStyles = {
  on_job: { ring: "ring-cyan-200", bg: "from-cyan-50 to-white" },
  available: { ring: "ring-emerald-200", bg: "from-emerald-50 to-white" },
  break: { ring: "ring-slate-200", bg: "from-slate-50 to-white" },
  offline: { ring: "ring-slate-200", bg: "from-slate-100/80 to-white" },
} as const;

const stageEmphasisStyles = {
  positive: "from-emerald-500 to-emerald-600",
  neutral: "from-indigo-500 to-indigo-600",
  attention: "from-amber-500 to-red-500",
} as const;

const officeTypeIcons = {
  estimate: FileText,
  invoice: FileText,
  job: Clock,
  lead: Inbox,
} as const;

type OperationsCommandBoardProps = {
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
  connections: SystemConnection[];
};

export function OperationsCommandBoard({
  actionQueue,
  officeQueue,
  jobs,
  technicians,
  moneyStages,
  expenseReview,
  leadOpportunity,
  connections,
}: OperationsCommandBoardProps) {
  const activeCount = jobs.filter((j) => j.status === "in_progress" || j.status === "en_route").length;
  const completedToday = jobs.filter((j) => j.status === "completed").length;

  return (
    <section aria-label="Operating command board" className={missionOperatingBoardClass}>
      {/* Board header — dark dock for hierarchy */}
      <div className={missionBoardHeaderClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={missionEyebrowClass}>Operating board</p>
            <h2 className={`mt-1 ${missionWorkspaceTitleClass}`}>
              Action · Work · Money — one connected loop
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Jobs move crews. Completed work becomes invoices. Overdue AR slows cash. Everything here
              affects dispatch, billing, and customer follow-through.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.map((link) => (
              <div
                key={link.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1.5 ring-1 ring-slate-700/50"
              >
                <span className="text-[10px] font-medium text-slate-300">{link.from}</span>
                <ArrowRight className="h-3 w-3 text-cyan-400/80" aria-hidden="true" />
                <span className="text-[10px] font-medium text-slate-300">{link.to}</span>
                <span className="hidden text-[10px] text-slate-500 sm:inline">· {link.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Three connected columns — light workspace content */}
      <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-slate-200/80">
        {/* ACTION NOW */}
        <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
          <div className={missionColumnHeaderClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                  <p className={missionEyebrowClass}>Action now</p>
                </div>
                <h3 className={`mt-1 ${missionWorkspaceHeadingClass}`}>Blockers on jobs & billing</h3>
                <p className="text-xs text-slate-400">Clear these to protect schedule and cash</p>
              </div>
              <Link href="/invoices?status=overdue" className={`shrink-0 ${missionLinkClass} !text-cyan-300 hover:!text-cyan-200`}>
                View all
              </Link>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {actionQueue.map((item) => {
              const style = urgencyStyles[item.urgency];
              return (
                <li key={item.id}>
                  <Link href="/invoices" className={`group block ${missionRowClass}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
                          {item.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${style.badge}`}
                        >
                          {item.urgency}
                        </span>
                      </div>
                      <p className={`mt-0.5 truncate ${missionMetaClass}`}>{item.meta}</p>
                      {item.impact ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{item.impact}</p>
                      ) : null}
                    </div>
                    {item.amount ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                        {item.amount}
                      </span>
                    ) : null}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-600"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto border-t border-slate-200/80 pt-3">
            <p className={missionLabelMutedClass}>Office follow-ups</p>
            <ul className="mt-2 flex flex-col gap-1">
              {officeQueue.map((item) => {
                const Icon = officeTypeIcons[item.type];
                return (
                  <li key={item.id}>
                    <Link
                      href="/jobs"
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-slate-100/80"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-slate-600 group-hover:text-slate-800">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-slate-400">{item.meta}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* WORK MOVING */}
        <div className="relative flex flex-col gap-4 border-t border-slate-200/80 p-4 sm:p-5 lg:border-t-0 lg:p-6">
          <div className={missionColumnHeaderClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <p className={missionEyebrowClass}>Work moving</p>
                </div>
                <h3 className={`mt-1 ${missionWorkspaceHeadingClass}`}>
                  {activeCount} calls active · {completedToday} ready to bill
                </h3>
                <p className="text-xs text-slate-400">Today&apos;s dispatch board · HVAC service & install</p>
              </div>
              <Link href="/dispatch" className={`shrink-0 ${missionLinkClass} !text-cyan-300 hover:!text-cyan-200`}>
                Dispatch
              </Link>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {jobs.map((job) => {
              const status = jobStatusStyles[job.status];
              return (
                <li key={job.id}>
                  <Link
                    href="/jobs"
                    className={`group flex items-center gap-3 ${missionRowClass}`}
                  >
                    <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-slate-500">
                      {job.time}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
                        {job.customer}
                      </p>
                      <p className={`truncate ${missionMetaClass}`}>
                        {job.job} · {job.technician}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wide ${status.text}`}>
                      {status.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto border-t border-slate-200/80 pt-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <p className={missionLabelMutedClass}>Crew load → dispatch pressure</p>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {technicians.map((tech) => {
                const style = techStateStyles[tech.state];
                return (
                  <li
                    key={tech.id}
                    className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${style.bg} px-2.5 py-2 ring-1 ${style.ring}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[9px] font-semibold text-slate-700">
                      {tech.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-700">
                        {tech.name.split(" ")[0]}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{tech.jobLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* MONEY WAITING */}
        <div className="relative flex flex-col gap-4 border-t border-slate-200/80 p-4 sm:p-5 lg:border-t-0 lg:p-6">
          <div className={missionColumnHeaderClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <p className={missionEyebrowClass}>Money waiting</p>
                </div>
                <h3 className={`mt-1 ${missionWorkspaceHeadingClass}`}>Completed work → cash</h3>
                <p className="text-xs text-slate-400">Invoice pipeline · what crews earned today</p>
              </div>
              <Link href="/invoices" className={`shrink-0 ${missionLinkClass} !text-cyan-300 hover:!text-cyan-200`}>
                Billing
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {moneyStages.map((stage) => {
              const emphasis = stage.emphasis ?? "neutral";
              return (
                <Link
                  key={stage.id}
                  href="/invoices"
                  className={`group flex items-center gap-3 ${missionRowClass}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium text-slate-700 group-hover:text-slate-900`}>
                        {stage.label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{stage.amount}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${stageEmphasisStyles[emphasis as keyof typeof stageEmphasisStyles] ?? stageEmphasisStyles.neutral}`}
                        style={{ width: `${stage.fill}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">{stage.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3">
            <Link
              href="/expenses"
              className="group rounded-xl bg-white/90 p-2.5 ring-1 ring-slate-200/90 shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all hover:ring-slate-300/90 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span className={missionLabelMutedClass}>Parts & expenses</span>
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                {expenseReview.pendingTotal}
              </p>
              <p className="text-[10px] text-slate-500">{expenseReview.pendingCount} to review</p>
            </Link>

            <Link
              href="/leads"
              className="group rounded-xl bg-gradient-to-br from-violet-50 to-white p-2.5 ring-1 ring-violet-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all hover:ring-violet-300/80"
            >
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
                <span className={missionLabelMutedClass}>{leadOpportunity.label}</span>
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">{leadOpportunity.value}</p>
              <p className="text-[10px] text-slate-500">{leadOpportunity.detail}</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
