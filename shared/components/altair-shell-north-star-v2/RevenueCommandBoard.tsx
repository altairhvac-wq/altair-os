import Link from "next/link";
import { ArrowUpRight, DollarSign, Receipt, Target } from "lucide-react";
import type { MoneyStage } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { missionZoneClass, missionEyebrowClass } from "./mission-tokens";

const stageEmphasisStyles = {
  positive: "from-emerald-500/80 to-emerald-600/60",
  neutral: "from-indigo-500/70 to-indigo-600/50",
  attention: "from-amber-500/80 to-red-500/60",
} as const;

type RevenueCommandBoardProps = {
  stages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
};

export function RevenueCommandBoard({
  stages,
  expenseReview,
  leadOpportunity,
}: RevenueCommandBoardProps) {
  return (
    <section aria-label="Money waiting" className={missionZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-amber-500/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400/80" aria-hidden="true" />
              <p className={missionEyebrowClass}>Money waiting</p>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">Cash pipeline</h2>
          </div>
          <Link
            href="/invoices"
            className="shrink-0 text-xs font-medium text-cyan-400/80 transition-colors hover:text-cyan-300"
          >
            Billing
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {stages.map((stage) => {
            const emphasis = stage.emphasis ?? "neutral";
            return (
              <Link
                key={stage.id}
                href="/invoices"
                className="group flex items-center gap-3 rounded-xl bg-slate-950/40 px-3.5 py-3 ring-1 ring-slate-800/35 transition-all hover:bg-slate-900/50 hover:ring-slate-700/45"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                      {stage.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-white">{stage.amount}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stageEmphasisStyles[emphasis as keyof typeof stageEmphasisStyles] ?? stageEmphasisStyles.neutral}`}
                      style={{ width: `${stage.fill}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">{stage.detail}</p>
                </div>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-400"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-4">
          <Link
            href="/expenses"
            className="group rounded-xl bg-slate-950/50 p-3 ring-1 ring-slate-800/40 transition-all hover:ring-slate-700/50"
          >
            <div className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Expenses
              </span>
            </div>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">
              {expenseReview.pendingTotal}
            </p>
            <p className="text-[10px] text-slate-500">{expenseReview.pendingCount} pending review</p>
          </Link>

          <Link
            href="/leads"
            className="group rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-950/60 p-3 ring-1 ring-violet-500/15 transition-all hover:ring-violet-500/30"
          >
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {leadOpportunity.label}
              </span>
            </div>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">{leadOpportunity.value}</p>
            <p className="text-[10px] text-slate-500">{leadOpportunity.detail}</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
