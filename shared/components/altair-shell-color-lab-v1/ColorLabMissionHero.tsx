"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OperatingSignal, PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ColorLabInsight } from "./sample-data";
import { ColorLabPrimaryAction } from "./ColorLabPrimaryAction";
import { usePaletteTokens } from "./palette-context";

type DayState = {
  operatorName: string;
  dateLabel: string;
  shiftLabel: string;
  monitoringMessage: string;
  primaryFocus: string;
  primaryImpact: string;
  opsScore: number;
};

type ColorLabMissionHeroProps = {
  dayState: DayState;
  signals: OperatingSignal[];
  topPriority: PriorityAction;
  secondaryActions: PriorityAction[];
  insight: ColorLabInsight;
};

export function ColorLabMissionHero({
  dayState,
  signals,
  topPriority,
  secondaryActions,
  insight,
}: ColorLabMissionHeroProps) {
  const t = usePaletteTokens();

  const signalValueByTone = {
    neutral: t.heroSignalNeutral,
    attention: t.heroSignalAttention,
    positive: t.heroSignalPositive,
    risk: t.heroSignalRisk,
  } as const;

  return (
    <section aria-label="Business command" className={t.heroShell}>
      <div aria-hidden="true" className={t.heroAccentRail} />

      <div className={t.heroHeader}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={t.eyebrowAccent}>Operating center</span>
              <span className={`text-[11px] ${t.heroShiftMuted}`}>·</span>
              <span className={t.eyebrowLight}>{dayState.dateLabel}</span>
              <span className={t.liveBadge}>
                <span className={`h-1.5 w-1.5 rounded-full ${t.heroLiveDot}`} aria-hidden="true" />
                Field ops live
              </span>
            </div>
            <h1 className={`mt-2 ${t.heroTitle}`}>Today&apos;s operating picture</h1>
            <p className={`mt-1.5 max-w-2xl ${t.bodySecondary}`}>
              {dayState.monitoringMessage}
              <span className={t.heroShiftMuted}> — {dayState.shiftLabel}</span>
            </p>
          </div>

          <div className={t.opsScoreInline}>
            <span className={t.opsScoreLabel}>Ops score</span>
            <span className={t.opsScoreValue}>{dayState.opsScore}</span>
            <div className={t.opsScoreDivider} aria-hidden="true" />
            <div className={t.opsScoreTrack}>
              <div className={t.opsScoreFill} style={{ width: `${dayState.opsScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className={t.heroBody}>
        <ColorLabPrimaryAction
          topPriority={topPriority}
          primaryFocus={dayState.primaryFocus}
          primaryImpact={dayState.primaryImpact}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-3">
            <div>
              <p className={t.eyebrowLight}>Then handle</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {secondaryActions.map((action, index) => (
                  <Link key={action.id} href={action.href} className={t.secondaryAction}>
                    <span className={t.secondaryActionIndex}>{index + 2}</span>
                    <span className={t.heroSecondaryLabel}>{action.label}</span>
                    {action.metric ? (
                      <span className={t.heroSecondaryMetric}>{action.metric.split(" · ")[0]}</span>
                    ) : null}
                    <ChevronRight className={t.heroSecondaryChevron} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>

            <div className={t.insightSurface}>
              <p className={t.heroInsightHeadline}>{insight.headline}</p>
              <p className={`mt-1 ${t.meta}`}>{insight.detail}</p>
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
                signalValueByTone[toneKey as keyof typeof signalValueByTone] ??
                signalValueByTone.neutral;

              return (
                <div key={signal.label} className={t.signalChip}>
                  <span className={`text-base font-semibold tabular-nums leading-none ${valueStyle}`}>
                    {signal.value}
                  </span>
                  <span className={t.signalLabel}>{signal.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className={t.heroFooter}>
        <div className={t.accentLine} />
      </div>
    </section>
  );
}
