import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";
import type { OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { V3Insight } from "./sample-data";
import { PrimaryActionPanel } from "./PrimaryActionPanel";
import {
  v3BodySecondaryDarkClass,
  v3BrassAccentLineClass,
  v3EyebrowDarkClass,
  v3HeroClass,
} from "./v3-tokens";

type DayState = {
  operatorName: string;
  dateLabel: string;
  shiftLabel: string;
  monitoringMessage: string;
  primaryFocus: string;
  primaryImpact: string;
  opsScore: number;
};

type BrassMissionHeroProps = {
  dayState: DayState;
  signals: OperatingSignal[];
  topPriority: PriorityAction;
  secondaryActions: PriorityAction[];
  insight: V3Insight;
};

const signalStyles = {
  neutral: "bg-white/[0.06] text-slate-100 ring-white/[0.08]",
  attention: "bg-amber-950/40 text-amber-100 ring-amber-600/20",
  positive: "bg-emerald-950/35 text-emerald-100 ring-emerald-600/20",
  risk: "bg-red-950/40 text-red-100 ring-red-600/20",
} as const;

export function BrassMissionHero({
  dayState,
  signals,
  topPriority,
  secondaryActions,
  insight,
}: BrassMissionHeroProps) {
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (dayState.opsScore / 100) * circumference;

  return (
    <section aria-label="Mission control" className={v3HeroClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[rgba(184,148,63,0.04)] blur-3xl"
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 ${v3BrassAccentLineClass}`} />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={v3EyebrowDarkClass}>{dayState.dateLabel}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-slate-200 ring-1 ring-white/[0.08]">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Field ops live
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
              Today&apos;s operating picture
            </h1>
            <p className={`mt-2 max-w-xl ${v3BodySecondaryDarkClass}`}>
              {dayState.monitoringMessage}
              <span className="text-slate-300"> — {dayState.shiftLabel}</span>
            </p>
          </div>

          <PrimaryActionPanel
            topPriority={topPriority}
            primaryFocus={dayState.primaryFocus}
            primaryImpact={dayState.primaryImpact}
          />

          <div className="flex flex-col gap-2">
            <p className={v3EyebrowDarkClass}>Then handle</p>
            <div className="flex flex-wrap gap-2">
              {secondaryActions.map((action, index) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.06] hover:ring-white/[0.12]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold tabular-nums text-slate-300">
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
                    className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-l-2 border-l-[rgba(184,148,63,0.45)] bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.08]">
            <p className="text-sm font-medium leading-snug text-slate-100">{insight.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{insight.detail}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 lg:items-end">
          <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#v3-ops-score)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="v3-ops-score" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#B8943F" />
                  <stop offset="100%" stopColor="#8B7232" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Activity className="mb-0.5 h-4 w-4 text-[#C6A757]" aria-hidden="true" />
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
                  className={`flex flex-col gap-0.5 rounded-xl px-3 py-2.5 ring-1 ${signalStyles[toneKey as keyof typeof signalStyles] ?? signalStyles.neutral}`}
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
