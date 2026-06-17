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
  missionEyebrowClass,
  missionRowClass,
  missionMetaClass,
  missionLabelMutedClass,
} from "./mission-tokens";

const urgencyStyles = {
  now: {
    badge: "bg-red-950/60 text-red-200 ring-red-500/30",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]",
  },
  today: {
    badge: "bg-amber-950/60 text-amber-200 ring-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  },
  soon: {
    badge: "bg-slate-800/80 text-slate-300 ring-slate-600/35",
    dot: "bg-slate-400",
  },
} as const;

const jobStatusStyles = {
  in_progress: { label: "On site", dot: "bg-cyan-400", text: "text-cyan-200" },
  en_route: { label: "En route", dot: "bg-indigo-400", text: "text-indigo-200" },
  scheduled: { label: "Scheduled", dot: "bg-slate-400", text: "text-slate-300" },
  completed: { label: "Complete", dot: "bg-emerald-400", text: "text-emerald-200" },
} as const;

const techStateStyles = {
  on_job: { ring: "ring-cyan-500/40", bg: "from-cyan-500/20 to-slate-800" },
  available: { ring: "ring-emerald-500/30", bg: "from-emerald-500/15 to-slate-800" },
  break: { ring: "ring-slate-600/30", bg: "from-slate-600/20 to-slate-800" },
  offline: { ring: "ring-slate-700/30", bg: "from-slate-700/20 to-slate-800" },
} as const;

const stageEmphasisStyles = {
  positive: "from-emerald-500/80 to-emerald-600/60",
  neutral: "from-indigo-500/70 to-indigo-600/50",
  attention: "from-amber-500/80 to-red-500/60",
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-400/20 via-cyan-400/25 to-amber-400/20"
      />

      {/* Board header — connected systems overview */}
      <div className="border-b border-slate-800/60 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={missionEyebrowClass}>Operating board</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
              Action · Work · Money — one connected loop
            </h2>
            <p className={`mt-1 max-w-2xl ${missionMetaClass}`}>
              Jobs move crews. Completed work becomes invoices. Overdue AR slows cash. Everything here
              affects dispatch, billing, and customer follow-through.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.map((link) => (
              <div
                key={link.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/50 px-2.5 py-1.5 ring-1 ring-slate-700/45"
              >
                <span className="text-[10px] font-medium text-slate-300">{link.from}</span>
                <ArrowRight className="h-3 w-3 text-cyan-500/70" aria-hidden="true" />
                <span className="text-[10px] font-medium text-slate-300">{link.to}</span>
                <span className="hidden text-[10px] text-slate-500 sm:inline">· {link.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Three connected columns — single surface, no stacked panels */}
      <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-slate-800/60">
        {/* ACTION NOW */}
        <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-red-500/5 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                <p className={missionEyebrowClass}>Action now</p>
              </div>
              <h3 className="mt-1 text-base font-semibold text-white">Blockers on jobs & billing</h3>
              <p className={missionMetaClass}>Clear these to protect schedule and cash</p>
            </div>
            <Link
              href="/invoices?status=overdue"
              className="shrink-0 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              View all
            </Link>
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
                        <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
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
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.impact}</p>
                      ) : null}
                    </div>
                    {item.amount ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">
                        {item.amount}
                      </span>
                    ) : null}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto border-t border-slate-800/50 pt-3">
            <p className={missionLabelMutedClass}>Office follow-ups</p>
            <ul className="mt-2 flex flex-col gap-1">
              {officeQueue.map((item) => {
                const Icon = officeTypeIcons[item.type];
                return (
                  <li key={item.id}>
                    <Link
                      href="/jobs"
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-slate-950/40"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-slate-300 group-hover:text-slate-200">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-slate-500">{item.meta}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* WORK MOVING */}
        <div className="relative flex flex-col gap-4 border-t border-slate-800/60 p-4 sm:p-5 lg:border-t-0 lg:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-500/6 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <p className={missionEyebrowClass}>Work moving</p>
              </div>
              <h3 className="mt-1 text-base font-semibold text-white">
                {activeCount} calls active · {completedToday} ready to bill
              </h3>
              <p className={missionMetaClass}>Today&apos;s dispatch board · HVAC service & install</p>
            </div>
            <Link
              href="/dispatch"
              className="shrink-0 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Dispatch
            </Link>
          </div>

          <ul className="flex flex-col gap-2">
            {jobs.map((job) => {
              const status = jobStatusStyles[job.status];
              return (
                <li key={job.id}>
                  <Link
                    href="/jobs"
                    className="group flex items-center gap-3 rounded-xl bg-slate-950/45 px-3.5 py-3 ring-1 ring-slate-800/45 transition-all hover:bg-slate-900/55 hover:ring-slate-700/50"
                  >
                    <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-slate-400">
                      {job.time}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
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

          <div className="mt-auto border-t border-slate-800/50 pt-3">
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
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-950/60 text-[9px] font-semibold text-slate-200">
                      {tech.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-200">
                        {tech.name.split(" ")[0]}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">{tech.jobLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* MONEY WAITING */}
        <div className="relative flex flex-col gap-4 border-t border-slate-800/60 p-4 sm:p-5 lg:border-t-0 lg:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-full bg-amber-500/6 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <p className={missionEyebrowClass}>Money waiting</p>
              </div>
              <h3 className="mt-1 text-base font-semibold text-white">Completed work → cash</h3>
              <p className={missionMetaClass}>Invoice pipeline · what crews earned today</p>
            </div>
            <Link
              href="/invoices"
              className="shrink-0 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Billing
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {moneyStages.map((stage) => {
              const emphasis = stage.emphasis ?? "neutral";
              return (
                <Link
                  key={stage.id}
                  href="/invoices"
                  className="group flex items-center gap-3 rounded-xl bg-slate-950/45 px-3.5 py-2.5 ring-1 ring-slate-800/45 transition-all hover:bg-slate-900/55 hover:ring-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {stage.label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-white">{stage.amount}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800/80">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${stageEmphasisStyles[emphasis as keyof typeof stageEmphasisStyles] ?? stageEmphasisStyles.neutral}`}
                        style={{ width: `${stage.fill}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{stage.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-800/50 pt-3">
            <Link
              href="/expenses"
              className="group rounded-xl bg-slate-950/50 p-2.5 ring-1 ring-slate-800/45 transition-all hover:ring-slate-700/50"
            >
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className={missionLabelMutedClass}>Parts & expenses</span>
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums text-white">
                {expenseReview.pendingTotal}
              </p>
              <p className="text-[10px] text-slate-400">{expenseReview.pendingCount} to review</p>
            </Link>

            <Link
              href="/leads"
              className="group rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-950/60 p-2.5 ring-1 ring-violet-500/20 transition-all hover:ring-violet-500/35"
            >
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                <span className={missionLabelMutedClass}>{leadOpportunity.label}</span>
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums text-white">{leadOpportunity.value}</p>
              <p className="text-[10px] text-slate-400">{leadOpportunity.detail}</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
