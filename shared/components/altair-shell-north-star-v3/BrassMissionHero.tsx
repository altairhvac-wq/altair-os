import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { V3Insight } from "./sample-data";
import { PrimaryActionPanel } from "./PrimaryActionPanel";
import {
  v3BodySecondaryClass,
  v3BrassAccentLineClass,
  v3EyebrowBrassClass,
  v3EyebrowLightClass,
  v3HeroBodyClass,
  v3HeroBrassRailClass,
  v3HeroFooterClass,
  v3HeroHeaderClass,
  v3HeroShellClass,
  v3HeroTitleClass,
  v3InsightSurfaceClass,
  v3MetaClass,
  v3OpsScoreInlineClass,
  v3SecondaryActionClass,
  v3SignalChipClass,
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

const signalValueStyles = {
  neutral: "text-[#292218]",
  attention: "text-amber-800",
  positive: "text-emerald-800",
  risk: "text-red-800",
} as const;

export function BrassMissionHero({
  dayState,
  signals,
  topPriority,
  secondaryActions,
  insight,
}: BrassMissionHeroProps) {
  return (
    <section aria-label="Business command" className={v3HeroShellClass}>
      <div aria-hidden="true" className={v3HeroBrassRailClass} />

      <div className={v3HeroHeaderClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={v3EyebrowBrassClass}>Operating center</span>
              <span className="text-[11px] text-[rgba(41,34,24,0.45)]">·</span>
              <span className={v3EyebrowLightClass}>{dayState.dateLabel}</span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Field ops live
              </span>
            </div>
            <h1 className={`mt-2 ${v3HeroTitleClass}`}>Today&apos;s operating picture</h1>
            <p className={`mt-1.5 max-w-2xl ${v3BodySecondaryClass}`}>
              {dayState.monitoringMessage}
              <span className="text-[rgba(41,34,24,0.55)]"> — {dayState.shiftLabel}</span>
            </p>
          </div>

          <div className={v3OpsScoreInlineClass}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7232]">
              Ops score
            </span>
            <span className="text-lg font-semibold tabular-nums text-[#292218]">{dayState.opsScore}</span>
            <div className="h-4 w-px bg-[rgba(184,148,63,0.25)]" aria-hidden="true" />
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EFEAE2]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B8943F] to-[#8B7232]"
                style={{ width: `${dayState.opsScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={v3HeroBodyClass}>
        <PrimaryActionPanel
          topPriority={topPriority}
          primaryFocus={dayState.primaryFocus}
          primaryImpact={dayState.primaryImpact}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-3">
            <div>
              <p className={v3EyebrowLightClass}>Then handle</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {secondaryActions.map((action, index) => (
                  <Link key={action.id} href={action.href} className={v3SecondaryActionClass}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EFEAE2] text-[10px] font-bold tabular-nums text-[#8B7232]">
                      {index + 2}
                    </span>
                    <span className="text-sm font-medium text-[#3D3428] group-hover:text-[#292218]">
                      {action.label}
                    </span>
                    {action.metric ? (
                      <span className="hidden text-xs tabular-nums text-[rgba(41,34,24,0.55)] sm:inline">
                        {action.metric.split(" · ")[0]}
                      </span>
                    ) : null}
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[rgba(41,34,24,0.40)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#8B7232]"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </div>

            <div className={v3InsightSurfaceClass}>
              <p className="text-sm font-medium leading-snug text-[#292218]">{insight.headline}</p>
              <p className={`mt-1 ${v3MetaClass}`}>{insight.detail}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[20rem] lg:grid-cols-2">
            {signals.map((signal) => {
              const emphasis = signal.emphasis ?? "neutral";
              const toneKey =
                emphasis === "attention" && signal.label.toLowerCase().includes("overdue")
                  ? "risk"
                  : emphasis;
              const valueStyle =
                signalValueStyles[toneKey as keyof typeof signalValueStyles] ?? signalValueStyles.neutral;

              return (
                <div key={signal.label} className={v3SignalChipClass}>
                  <span className={`text-base font-semibold tabular-nums leading-none ${valueStyle}`}>
                    {signal.value}
                  </span>
                  <span className="text-[10px] leading-tight text-[rgba(41,34,24,0.55)]">{signal.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className={v3HeroFooterClass}>
        <div className={v3BrassAccentLineClass} />
      </div>
    </section>
  );
}
