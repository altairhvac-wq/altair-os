"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardCommandStrip } from "@/shared/components/dashboard/DashboardCommandStrip";
import { OperationalResolutionQueueSheet } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueSheet";
import { HorizonHero } from "@/shared/design-system/signature";
import { signatureCockpitSurfaceClass } from "@/shared/design-system/shell/tokens";
import { buildDashboardSignatureHeroContent } from "@/shared/lib/dashboard-signature-hero";
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

type DashboardSignatureHeroProps = {
  data: DashboardData;
  /** Mobile uses fewer highlights and compact band sizing. */
  variant?: "desktop" | "mobile";
};

const MOBILE_HIGHLIGHT_TONE_CLASS: Record<string, string> = {
  neutral: "text-slate-900",
  success: "text-emerald-800",
  warning: "text-amber-800",
  danger: "text-rose-800",
  info: "text-sky-800",
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

function CockpitPriorityModule({
  recommendation,
  onSelect,
}: {
  recommendation: OfficePriorityRecommendation;
  onSelect: () => void;
}) {
  const accentClass =
    recommendation.impactCategory === "dispatch"
      ? "border-l-rose-400/70"
      : recommendation.impactCategory === "cash_collection"
        ? "border-l-amber-400/70"
        : "border-l-cyan-400/70";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-start gap-2.5 rounded-lg border-l-2 ${accentClass} bg-slate-50/50 px-3 py-2.5 text-left transition-colors hover:bg-white/70 lg:max-w-sm lg:shrink-0`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Top priority
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">
          {recommendation.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600">
          {recommendation.description}
        </p>
      </div>
      <ChevronRight
        className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-600"
        aria-hidden="true"
      />
    </button>
  );
}

function MobileCockpitSignals({
  highlights,
}: {
  highlights: ReturnType<typeof buildDashboardSignatureHeroContent>["highlights"];
}) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200/40 pt-3">
      {highlights.map((highlight) => {
        const tone = highlight.tone ?? "neutral";
        return (
          <div key={`${highlight.label}-${highlight.value}`} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {highlight.label}
            </p>
            <p
              className={`mt-0.5 truncate text-sm font-bold tabular-nums tracking-tight ${MOBILE_HIGHLIGHT_TONE_CLASS[tone] ?? MOBILE_HIGHLIGHT_TONE_CLASS.neutral}`}
            >
              {highlight.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardSignatureHero({
  data,
  variant = "desktop",
}: DashboardSignatureHeroProps) {
  const isMobile = variant === "mobile";
  const content = buildDashboardSignatureHeroContent(data, {
    maxHighlights: isMobile ? 2 : 0,
  });
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const recommendations = useMemo(
    () => buildOfficePriorityRecommendations(data),
    [data],
  );
  const actionCards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);
  const topRecommendation = recommendations[0];

  return (
    <>
      <HorizonHero
        tone="cyan"
        beamTone="cyan"
        beamPosition="center"
        size={isMobile ? "compact" : "cockpit"}
      >
        <div className={signatureCockpitSurfaceClass}>
          <div
            className={
              isMobile
                ? "flex flex-col gap-3"
                : "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
            }
          >
            <div className="min-w-0 flex-1">
              {content.eyebrow ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700/90">
                  {content.eyebrow}
                </p>
              ) : null}
              <h1
                className={`font-bold tracking-tight text-slate-900 ${
                  isMobile ? "mt-1 text-lg" : "mt-1 text-xl lg:text-[1.35rem]"
                }`}
              >
                {content.title}
              </h1>
              {content.description ? (
                <p
                  className={`max-w-2xl leading-relaxed text-slate-600 ${
                    isMobile ? "mt-1.5 text-sm" : "mt-2 text-sm lg:text-[0.925rem]"
                  }`}
                >
                  {content.description}
                </p>
              ) : null}
            </div>

            {!isMobile && topRecommendation ? (
              <CockpitPriorityModule
                recommendation={topRecommendation}
                onSelect={() =>
                  setActiveCard(
                    resolvePriorityActionCard(topRecommendation, actionCards),
                  )
                }
              />
            ) : null}
          </div>

          {isMobile ? (
            <MobileCockpitSignals highlights={content.highlights} />
          ) : (
            <DashboardCommandStrip data={data} variant="embedded" />
          )}
        </div>
      </HorizonHero>

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
