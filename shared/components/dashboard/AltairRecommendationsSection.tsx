"use client";

import { ChevronRight } from "lucide-react";
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
  /** When true, omits rank #1 — already shown in the operations cockpit. */
  skipTopPriority?: boolean;
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
  demoted,
}: {
  recommendation: OfficePriorityRecommendation;
  onSelect: () => void;
  compact: boolean;
  demoted: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group flex w-full items-start gap-2 text-left transition-colors ${
          demoted
            ? `border-b border-slate-100 py-2.5 last:border-b-0 hover:bg-slate-50/80 ${compact ? "px-0" : "px-0.5"}`
            : `rounded-lg border border-slate-200/90 bg-white hover:border-cyan-200 hover:bg-cyan-50/30 active:scale-[0.99] ${
                compact ? "px-2.5 py-2" : "px-3 py-2.5"
              }`
        }`}
      >
        <span
          className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md font-bold tabular-nums ${
            demoted
              ? "h-5 w-5 bg-slate-100 text-[10px] text-slate-600"
              : "bg-cyan-100 font-black text-cyan-800"
          } ${compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"}`}
          aria-hidden="true"
        >
          {recommendation.priority}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block font-semibold text-slate-900 ${
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
          {!compact && !demoted ? (
            <span className="mt-1 block text-[11px] leading-snug text-slate-500">
              {recommendation.reason}
            </span>
          ) : null}
        </span>
        {demoted ? (
          <ChevronRight
            className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-500"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </li>
  );
}

export function AltairRecommendationsSection({
  data,
  variant = "mobile",
  skipTopPriority = false,
}: AltairRecommendationsSectionProps) {
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const recommendations = useMemo(
    () => buildOfficePriorityRecommendations(data),
    [data],
  );
  const actionCards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);
  const compact = variant === "mobile";
  const demoted = variant === "desktop";
  const visibleRecommendations = skipTopPriority
    ? recommendations.slice(1)
    : recommendations;

  if (visibleRecommendations.length === 0) {
    return null;
  }

  return (
    <>
      <section
        aria-label="Altair recommendations"
        className={
          compact
            ? "min-w-0"
            : "min-w-0 rounded-xl bg-slate-50/40 px-3 py-2.5 lg:px-4 lg:py-3"
        }
      >
        <header className={`flex items-center gap-1.5 ${compact ? "mb-1.5" : "mb-2"}`}>
          <div className="min-w-0">
            <h2
              className={`font-semibold tracking-tight text-slate-800 ${
                compact ? "text-sm" : "text-sm"
              }`}
            >
              {skipTopPriority ? "Next actions" : "Altair Recommendations"}
            </h2>
            {!compact ? (
              <p className="text-[11px] text-slate-500 lg:text-xs">
                Ranked by impact — tap to open queue
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Tap a priority to open its queue
              </p>
            )}
          </div>
        </header>

        <ul className={demoted ? "divide-y divide-slate-100" : compact ? "space-y-1.5" : "space-y-2"}>
          {visibleRecommendations.map((recommendation) => (
            <RecommendationRow
              key={recommendation.id}
              recommendation={recommendation}
              compact={compact}
              demoted={demoted}
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
