import Link from "next/link";
import { ArrowRight, Activity, ChevronRight } from "lucide-react";
import type { OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { MissionInsight } from "./sample-data";
import {
  missionHeroClass,
  missionEyebrowClass,
  missionBodySecondaryClass,
  missionMetaDarkClass,
} from "./mission-tokens";

type DayState = {
  greeting: string;
  dateLabel: string;
  shiftLabel: string;
  monitoringMessage: string;
  primaryFocus: string;
  primaryImpact: string;
  opsScore: number;
};

type CommandCenterHeroProps = {
  dayState: DayState;
  signals: OperatingSignal[];
  topPriority: PriorityAction;
  secondaryActions: PriorityAction[];
  insight: MissionInsight;
};

const signalStyles = {
  neutral: "from-slate-800/80 to-slate-900/60 text-slate-100 ring-slate-600/45",
  attention: "from-amber-950/60 to-slate-900/60 text-amber-100 ring-amber-500/25",
  positive: "from-emerald-950/50 to-slate-900/60 text-emerald-100 ring-emerald-500/20",
  risk: "from-red-950/50 to-slate-900/60 text-red-100 ring-red-500/25",
} as const;

export function CommandCenterHero({
  dayState,
  signals,
  topPriority,
  secondaryActions,
  insight,
}: CommandCenterHeroProps) {
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (dayState.opsScore / 100) * circumference;

  return (
    <section aria-label="Command center" className={missionHeroClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={missionEyebrowClass}>{dayState.dateLabel}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/50 px-2.5 py-1 text-[11px] font-medium text-cyan-200 ring-1 ring-cyan-500/25">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </span>
              Field ops live
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
              Good morning, {dayState.greeting}
            </h1>
            <p className={`mt-2 max-w-xl ${missionBodySecondaryClass}`}>
              {dayState.monitoringMessage}
              <span className="text-slate-200"> — {dayState.shiftLabel}</span>
            </p>
          </div>

          {/* PRIMARY ACTION — undeniable first move */}
          <Link
            href={topPriority.href}
            className="group relative flex max-w-2xl flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/80 via-[#0a1424]/90 to-indigo-950/70 p-5 ring-2 ring-cyan-400/40 shadow-[0_0_40px_-8px_rgba(34,211,238,0.35),0_20px_60px_-20px_rgba(0,0,0,0.6)] transition-all hover:ring-cyan-300/55 hover:shadow-[0_0_56px_-6px_rgba(34,211,238,0.45)] sm:p-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_120%_at_0%_50%,rgba(34,211,238,0.12),transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200 ring-1 ring-cyan-400/35">
                    Do this first
                  </span>
                  <span className="text-[11px] font-medium text-cyan-300/90">Right now</span>
                </div>
                <p className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl">
                  {topPriority.label}
                </p>
                {topPriority.metric ? (
                  <p className="mt-1.5 text-base tabular-nums text-cyan-100">{topPriority.metric}</p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-slate-200">{dayState.primaryFocus}</p>
                <p className={`mt-1 ${missionMetaDarkClass}`}>{dayState.primaryImpact}</p>
              </div>
              <span className="relative inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-cyan-400/20 px-5 py-3 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/40 transition-all group-hover:bg-cyan-400/30 group-hover:ring-cyan-200/50 sm:self-center">
                Start now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </Link>

          {/* Secondary priorities — compact, not a separate panel grid */}
          <div className="flex flex-col gap-2">
            <p className={missionEyebrowClass}>Then handle</p>
            <div className="flex flex-wrap gap-2">
              {secondaryActions.map((action, index) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group inline-flex items-center gap-2 rounded-xl bg-slate-950/60 px-3.5 py-2.5 ring-1 ring-slate-700/50 transition-all hover:bg-slate-900/70 hover:ring-slate-600/55"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800/80 text-[10px] font-bold tabular-nums text-slate-300">
                    {index + 2}
                  </span>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                    {action.label}
                  </span>
                  {action.metric ? (
                    <span className="hidden text-xs tabular-nums text-slate-400 sm:inline">
                      {action.metric.split(" · ")[0]}
                    </span>
                  ) : null}
                  <ChevronRight
                    className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Intelligence strip — inline, not a side panel */}
          <div className="rounded-xl bg-violet-950/30 px-4 py-3 ring-1 ring-violet-500/20">
            <p className="text-sm font-medium leading-snug text-violet-100">{insight.headline}</p>
            <p className={`mt-1 ${missionMetaDarkClass} leading-relaxed`}>{insight.detail}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 lg:items-end">
          <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="5" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#mission-ops-score)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="mission-ops-score" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Activity className="mb-0.5 h-4 w-4 text-cyan-300" aria-hidden="true" />
              <span className="text-2xl font-semibold tabular-nums text-white">{dayState.opsScore}</span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400">ops score</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[18rem] lg:grid-cols-2">
            {signals.map((signal) => {
              const emphasis = signal.emphasis ?? "neutral";
              const toneKey =
                emphasis === "attention" && signal.label.toLowerCase().includes("overdue")
                  ? "risk"
                  : emphasis;
              return (
                <div
                  key={signal.label}
                  className={`flex flex-col gap-0.5 rounded-xl bg-gradient-to-br px-3 py-2.5 ring-1 ${signalStyles[toneKey as keyof typeof signalStyles] ?? signalStyles.neutral}`}
                >
                  <span className="text-lg font-semibold tabular-nums leading-none">{signal.value}</span>
                  <span className="text-[10px] leading-tight text-slate-400">{signal.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
