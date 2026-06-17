import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import type { OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { missionHeroClass, missionEyebrowClass } from "./mission-tokens";

type DayState = {
  greeting: string;
  dateLabel: string;
  shiftLabel: string;
  monitoringMessage: string;
  primaryFocus: string;
  opsScore: number;
};

type CommandCenterHeroProps = {
  dayState: DayState;
  signals: OperatingSignal[];
  topPriority: PriorityAction;
};

const signalStyles = {
  neutral: "from-slate-800/80 to-slate-900/60 text-slate-200 ring-slate-700/40",
  attention: "from-amber-950/60 to-slate-900/60 text-amber-100 ring-amber-500/20",
  positive: "from-emerald-950/50 to-slate-900/60 text-emerald-100 ring-emerald-500/15",
  risk: "from-red-950/50 to-slate-900/60 text-red-100 ring-red-500/20",
} as const;

export function CommandCenterHero({ dayState, signals, topPriority }: CommandCenterHeroProps) {
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
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={missionEyebrowClass}>{dayState.dateLabel}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/50 px-2.5 py-1 text-[11px] font-medium text-cyan-300 ring-1 ring-cyan-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </span>
              Monitoring active
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
              Good morning, {dayState.greeting}
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-400 sm:text-lg">
              {dayState.monitoringMessage}
              <span className="text-slate-300"> — {dayState.shiftLabel}</span>
            </p>
          </div>

          <Link
            href={topPriority.href}
            className="group relative flex max-w-2xl flex-col gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900/80 to-indigo-950/60 p-5 ring-1 ring-cyan-500/30 transition-all hover:ring-cyan-400/50 hover:shadow-[0_16px_48px_-12px_rgba(34,211,238,0.2)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_0%_50%,rgba(34,211,238,0.08),transparent_60%)]"
            />
            <div className="relative min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
                Do this first
              </p>
              <p className="mt-1 text-lg font-semibold text-white sm:text-xl">{topPriority.label}</p>
              {topPriority.metric ? (
                <p className="mt-1 text-sm tabular-nums text-cyan-200/80">{topPriority.metric}</p>
              ) : null}
              <p className="mt-2 text-sm text-slate-400">{dayState.primaryFocus}</p>
            </div>
            <span className="relative inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-400/30 transition-all group-hover:bg-cyan-500/25 sm:self-center">
              Take action
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-4 lg:items-end">
          <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="5" />
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
              <Activity className="mb-0.5 h-4 w-4 text-cyan-400/80" aria-hidden="true" />
              <span className="text-2xl font-semibold tabular-nums text-white">{dayState.opsScore}</span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">ops score</span>
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
                  <span className="text-[10px] leading-tight text-slate-500">{signal.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
