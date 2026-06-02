"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { OperationalResolutionQueueSheet } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueSheet";
import {
  buildMobileActionCards,
  buildMobileActionSheetData,
  getMobileActionCardByQueueType,
  type MobileActionCard,
} from "@/shared/lib/mobile-action-dashboard";
import {
  buildOfficePriorityRecommendations,
  recommendationToMobileActionCard,
  type OfficePriorityRecommendation,
} from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";

type AltairRecommendationsSectionProps = {
  data: DashboardData;
  variant?: "mobile" | "desktop";
};

function resolveActionCard(
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

function RecommendationRow({
  recommendation,
  onSelect,
  compact,
}: {
  recommendation: OfficePriorityRecommendation;
  onSelect: () => void;
  compact: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-start gap-2 rounded-lg border border-slate-200/90 bg-white text-left transition-colors hover:border-cyan-200 hover:bg-cyan-50/30 active:scale-[0.99] ${
          compact ? "px-2.5 py-2" : "px-3 py-2.5"
        }`}
      >
        <span
          className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md bg-cyan-100 font-black tabular-nums text-cyan-800 ${
            compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"
          }`}
          aria-hidden="true"
        >
          {recommendation.priority}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block font-bold text-slate-900 ${
              compact ? "text-xs leading-tight" : "text-sm"
            }`}
          >
            {recommendation.title}
          </span>
          <span
            className={`mt-0.5 block text-slate-600 ${
              compact ? "text-[11px] leading-snug" : "text-xs"
            }`}
          >
            {recommendation.description}
          </span>
          {!compact ? (
            <span className="mt-1 block text-[11px] leading-snug text-slate-500">
              {recommendation.reason}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function AltairRecommendationsSection({
  data,
  variant = "mobile",
}: AltairRecommendationsSectionProps) {
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const recommendations = useMemo(
    () => buildOfficePriorityRecommendations(data),
    [data],
  );
  const actionCards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);
  const compact = variant === "mobile";

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <>
      <section
        aria-label="Altair recommendations"
        className={compact ? "min-w-0" : "min-w-0 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"}
      >
        <header
          className={`flex items-center gap-1.5 ${
            compact ? "mb-1.5" : "mb-2 border-b border-slate-100 pb-2"
          }`}
        >
          <Sparkles
            className={`shrink-0 text-cyan-600 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              className={`font-black tracking-tight text-slate-900 ${
                compact ? "text-sm" : "text-sm lg:text-base"
              }`}
            >
              Altair Recommendations
            </h2>
            {!compact ? (
              <p className="text-[11px] text-slate-500 lg:text-xs">
                Top {recommendations.length} priorities from live operational data
              </p>
            ) : null}
          </div>
        </header>

        <ul className={compact ? "space-y-1.5" : "space-y-2"}>
          {recommendations.map((recommendation) => (
            <RecommendationRow
              key={recommendation.id}
              recommendation={recommendation}
              compact={compact}
              onSelect={() =>
                setActiveCard(resolveActionCard(recommendation, actionCards))
              }
            />
          ))}
        </ul>
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
