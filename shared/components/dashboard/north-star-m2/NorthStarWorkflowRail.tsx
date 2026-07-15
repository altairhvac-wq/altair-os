import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  ReceiptText,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  buildDashboardWorkflowRail,
  type DashboardWorkflowStageId,
  type DashboardWorkflowStageState,
} from "@/shared/lib/dashboard-workflow-rail";
import type { DashboardData } from "@/shared/types/dashboard";

type NorthStarWorkflowRailProps = {
  data: DashboardData;
};

const STAGE_ICONS: Record<DashboardWorkflowStageId, LucideIcon> = {
  lead: Users,
  quote: FileText,
  schedule: CalendarDays,
  execute: Wrench,
  review: ClipboardCheck,
  bill: ReceiptText,
  collect: CircleDollarSign,
};

const STATE_STYLES: Record<
  DashboardWorkflowStageState,
  { dot: string; border: string; label: string }
> = {
  clear: {
    dot: "bg-emerald-500",
    border: "border-slate-200 hover:border-emerald-300",
    label: "Clear",
  },
  active: {
    dot: "bg-cyan-500",
    border: "border-cyan-200 hover:border-cyan-300",
    label: "Active",
  },
  attention: {
    dot: "bg-amber-500",
    border: "border-amber-200 hover:border-amber-300",
    label: "Attention",
  },
  critical: {
    dot: "bg-rose-500",
    border: "border-rose-200 hover:border-rose-300",
    label: "Priority",
  },
};

export function NorthStarWorkflowRail({ data }: NorthStarWorkflowRailProps) {
  const stages = buildDashboardWorkflowRail(data);

  return (
    <section
      aria-labelledby="workflow-pulse-title"
      className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.32)]"
    >
      <div className="flex items-end justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7232]">
            Workflow pulse
          </p>
          <h2
            id="workflow-pulse-title"
            className="mt-0.5 text-base font-semibold text-slate-950"
          >
            Lead to cash
          </h2>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">
          Where work is moving—and where it needs attention.
        </p>
      </div>

      <ol className="grid auto-cols-[minmax(9rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:thin] sm:px-4 lg:auto-cols-fr lg:overflow-visible">
        {stages.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const state = STATE_STYLES[stage.state];

          return (
            <li key={stage.id} className="relative min-w-0">
              <Link
                href={stage.href}
                className={`group flex min-h-[7.25rem] flex-col rounded-xl border bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${state.border}`}
                aria-label={`${stage.label}: ${stage.value}. ${stage.meta}. ${state.label}.`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-200/80">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${state.dot}`}
                      aria-hidden="true"
                    />
                    {state.label}
                  </span>
                </div>
                <div className="mt-auto pt-3">
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {stage.label}
                    </span>
                    <span className="text-xl font-semibold tabular-nums leading-none text-slate-950">
                      {stage.value}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {stage.meta}
                  </p>
                </div>
              </Link>
              {index < stages.length - 1 ? (
                <ArrowRight
                  className="pointer-events-none absolute -right-2.5 top-1/2 z-10 hidden h-3 w-3 -translate-y-1/2 text-slate-300 lg:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
