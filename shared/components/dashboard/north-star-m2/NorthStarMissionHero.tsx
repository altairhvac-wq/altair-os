"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OperationalResolutionQueueSheet } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueSheet";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import {
  buildNorthStarHeroContent,
  formatNorthStarImpactCategoryLabel,
  formatNorthStarRecommendationMetric,
} from "@/shared/lib/dashboard-north-star-hero";
import {
  buildMobileActionCards,
  buildMobileActionSheetData,
  getMobileActionCardByQueueType,
  type MobileActionCard,
} from "@/shared/lib/mobile-action-dashboard";
import {
  recommendationToMobileActionCard,
  type OfficePriorityRecommendation,
} from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";

type NorthStarMissionHeroProps = {
  data: DashboardData;
  dateLabel: string;
};

function resolvePriorityActionCard(
  recommendation: OfficePriorityRecommendation,
  cards: MobileActionCard[],
): MobileActionCard {
  const existing = getMobileActionCardByQueueType(
    cards,
    recommendation.relatedQueue,
  );
  if (existing) {
    return existing;
  }
  return recommendationToMobileActionCard(recommendation);
}

function PrimaryActionCard({
  recommendation,
  onSelect,
}: {
  recommendation: OfficePriorityRecommendation;
  onSelect: () => void;
}) {
  const metric = formatNorthStarRecommendationMetric(recommendation);

  return (
    <button type="button" onClick={onSelect} className={t.primaryAction}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={t.accentBadge}>Do this first</span>
            <span className="text-[11px] font-medium text-slate-400">
              {formatNorthStarImpactCategoryLabel(recommendation.impactCategory)}
            </span>
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
            {recommendation.title}
          </p>
          {metric ? (
            <p className={t.primaryActionMetric}>{metric}</p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-slate-200">
            {recommendation.description}
          </p>
          <p className={`mt-1 line-clamp-2 ${t.metaDark}`}>
            {recommendation.reason}
          </p>
        </div>
        <span className={t.accentCta}>
          Start now
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </button>
  );
}

function OperationsClearCard() {
  return (
    <div className={t.primaryAction}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={t.accentBadge}>Operations clear</span>
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
            No urgent office priorities right now
          </p>
          <p className="mt-2 text-sm font-medium text-slate-200">
            The ranked priority queue is empty — field and billing follow-ups are
            in good shape for now.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/dispatch?focus=today"
              className="text-xs font-medium text-[#C6A757] transition-colors hover:text-[#E8DDC2]"
            >
              Today&apos;s dispatch board
            </Link>
            <Link
              href="/reports"
              className="text-xs font-medium text-[#C6A757] transition-colors hover:text-[#E8DDC2]"
            >
              View reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecondaryActionButton({
  recommendation,
  onSelect,
}: {
  recommendation: OfficePriorityRecommendation;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={t.secondaryAction}
    >
      <span className={t.secondaryActionIndex}>{recommendation.priority}</span>
      <span className="text-sm font-medium text-slate-200">
        {recommendation.title}
      </span>
      <ChevronRight
        className="h-3.5 w-3.5 text-slate-500"
        aria-hidden="true"
      />
    </button>
  );
}

export function NorthStarMissionHero({
  data,
  dateLabel,
}: NorthStarMissionHeroProps) {
  const content = useMemo(() => buildNorthStarHeroContent(data), [data]);
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const actionCards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);

  const openRecommendation = (recommendation: OfficePriorityRecommendation) => {
    setActiveCard(resolvePriorityActionCard(recommendation, actionCards));
  };

  return (
    <>
      <section aria-label="Business command" className={t.heroShell}>
        <div aria-hidden="true" className={t.heroAccentRail} />

        <div className={t.heroHeader}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={t.eyebrowAccent}>Operating center</span>
                <span className="text-[11px] text-slate-400">·</span>
                <span className={t.eyebrowLight}>{dateLabel}</span>
                <span className={t.liveBadge}>
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  Field ops live
                </span>
              </div>
              <h1 className={`mt-2 ${t.heroTitle}`}>{content.title}</h1>
              <p className={`mt-1.5 max-w-2xl ${t.bodySecondary}`}>
                {content.operatingMessage}
              </p>
            </div>

            <div className={t.opsScoreInline}>
              <span className={t.opsScoreLabel}>Ops score</span>
              <span className={t.opsScoreValue}>{content.opsScore}</span>
              <div className={t.opsScoreDivider} aria-hidden="true" />
              <div className={t.opsScoreTrack}>
                <div
                  className={t.opsScoreFill}
                  style={{ width: `${content.opsScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={t.heroBody}>
          {content.primary ? (
            <PrimaryActionCard
              recommendation={content.primary}
              onSelect={() => openRecommendation(content.primary!)}
            />
          ) : (
            <OperationsClearCard />
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <p className={t.eyebrowLight}>Then handle</p>
                {content.secondary.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {content.secondary.map((recommendation) => (
                      <SecondaryActionButton
                        key={recommendation.id}
                        recommendation={recommendation}
                        onSelect={() => openRecommendation(recommendation)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className={`mt-2 ${t.meta}`}>
                    {content.isOperationsClear
                      ? "No additional ranked priorities."
                      : "No secondary priorities beyond the top action."}
                  </p>
                )}
              </div>

              {content.insight ? (
                <div className={t.insightSurface}>
                  <p className="text-sm font-medium leading-snug text-white">
                    {content.insight.title}
                  </p>
                  <p className={`mt-1 ${t.meta}`}>{content.insight.detail}</p>
                </div>
              ) : null}
            </div>

            {content.signalChips.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[20rem] lg:grid-cols-2">
                {content.signalChips.map((signal) => (
                  <div key={signal.label} className={t.signalChip}>
                    <span className="text-base font-semibold tabular-nums leading-none text-white">
                      {signal.value}
                    </span>
                    <span className={t.signalLabel}>{signal.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div aria-hidden="true" className={t.heroFooter}>
          <div className={t.accentLine} />
        </div>
      </section>

      {activeCard?.queueType ? (
        <OperationalResolutionQueueSheet
          card={activeCard}
          sheetData={sheetData}
          onClose={() => setActiveCard(null)}
        />
      ) : null}
    </>
  );
}
