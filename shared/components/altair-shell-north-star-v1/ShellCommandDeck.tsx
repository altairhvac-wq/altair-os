import type { OperatingLink, OperatingNode, OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { OperatingMap } from "@/shared/components/dashboard/north-star-v2/OperatingMap";
import { PriorityActionDock } from "@/shared/components/dashboard/north-star-v2/PriorityActionDock";
import { shellCommandDeckClass } from "./shell-tokens";

const signalToneStyles = {
  neutral: "from-slate-800/90 to-slate-900/70 text-slate-200",
  attention: "from-amber-950/50 to-slate-900/70 text-amber-100",
  positive: "from-emerald-950/40 to-slate-900/70 text-emerald-100",
  risk: "from-red-950/50 to-slate-900/70 text-red-100",
} as const;

type DayState = {
  greeting: string;
  dateLabel: string;
  shiftLabel: string;
  focusLabel: string;
  progress: number;
};

type ShellCommandDeckProps = {
  dayState: DayState;
  signals: OperatingSignal[];
  priorityActions: PriorityAction[];
  operatingNodes: OperatingNode[];
  operatingLinks: OperatingLink[];
};

function DayStatePanel({ dayState, signals }: { dayState: DayState; signals: OperatingSignal[] }) {
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (dayState.progress / 100) * circumference;

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[13.5rem] lg:shrink-0">
      <div className="relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
        <div className="relative h-[5.5rem] w-[5.5rem] shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#shell-day-progress)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient id="shell-day-progress" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold tabular-nums text-white">{dayState.progress}%</span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-slate-500">day</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
            {dayState.dateLabel}
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Good morning, {dayState.greeting}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">{dayState.shiftLabel}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-slate-700/50">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/90" aria-hidden="true" />
            Focus · {dayState.focusLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {signals.map((signal) => {
          const emphasis = signal.emphasis ?? "neutral";
          const toneKey =
            emphasis === "attention" && signal.label.toLowerCase().includes("overdue")
              ? "risk"
              : emphasis;
          return (
            <div
              key={signal.label}
              className={`flex flex-col gap-0.5 rounded-xl bg-gradient-to-br px-2.5 py-2 ring-1 ring-white/[0.04] ${signalToneStyles[toneKey as keyof typeof signalToneStyles] ?? signalToneStyles.neutral}`}
            >
              <span className="text-lg font-semibold tabular-nums leading-none">{signal.value}</span>
              <span className="text-[10px] leading-tight text-slate-500">{signal.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShellCommandDeck({
  dayState,
  signals,
  priorityActions,
  operatingNodes,
  operatingLinks,
}: ShellCommandDeckProps) {
  return (
    <section aria-label="Command deck" className={shellCommandDeckClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
        <DayStatePanel dayState={dayState} signals={signals} />
        <OperatingMap nodes={operatingNodes} links={operatingLinks} />
        <PriorityActionDock actions={priorityActions} />
      </div>
    </section>
  );
}
