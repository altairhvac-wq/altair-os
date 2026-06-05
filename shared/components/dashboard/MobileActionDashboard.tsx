"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import {
  MobileActionCardChevron,
  MOBILE_ACTION_QUIET_TILE,
  MOBILE_ACTION_SEVERITY_STYLES,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionSheet";
import { OperationalResolutionQueueSheet } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueSheet";
import {
  getAltairCoveredQueueTypes,
  isCoveredByAltairRecommendations,
} from "@/shared/lib/dashboard-surface-dedup";
import {
  buildMobileActionCards,
  buildMobileActionSheetData,
  type MobileActionCard,
} from "@/shared/lib/mobile-action-dashboard";
import {
  buildOfficePriorityRecommendations,
} from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";

type MobileActionDashboardProps = {
  data: DashboardData;
};

const VISIBLE_CARD_LIMIT = 8;

function MobileActionTile({
  card,
  onOpenSheet,
}: {
  card: MobileActionCard;
  onOpenSheet: (card: MobileActionCard) => void;
}) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const styles = MOBILE_ACTION_SEVERITY_STYLES[card.severity];
  const Icon = styles.icon;
  const isQuiet = card.category === "quiet-summary";

  const content = (
    <div className="flex min-h-[5.25rem] max-h-[6.5rem] items-center gap-2 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <span
          className={`block text-xl font-black tabular-nums leading-none tracking-tight ${
            isQuiet ? "text-slate-700" : styles.count
          }`}
        >
          {card.count}
        </span>
        <span
          className={`mt-1 block truncate text-[11px] font-semibold leading-tight ${
            isQuiet ? "text-slate-500" : "text-slate-800"
          }`}
        >
          {card.label}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
        <Icon
          className={`h-3 w-3 ${isQuiet ? "text-slate-400" : styles.iconClass}`}
          aria-hidden="true"
        />
        <MobileActionCardChevron />
      </div>
    </div>
  );

  const tileClass = `flex w-full flex-col rounded-xl border text-left transition-colors hover:bg-slate-50/80 active:scale-[0.98] ${
    isQuiet ? MOBILE_ACTION_QUIET_TILE : styles.tile
  }`;

  if (card.queueType) {
    return (
      <li>
        <button type="button" onClick={() => onOpenSheet(card)} className={tileClass}>
          {content}
        </button>
      </li>
    );
  }

  if (card.panelId && hasPanel(card.panelId)) {
    return (
      <li>
        <button
          type="button"
          onClick={() => openDashboardPanel(card.panelId!)}
          className={tileClass}
        >
          {content}
        </button>
      </li>
    );
  }

  if (card.href) {
    return (
      <li>
        <Link href={card.href} className={tileClass}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={tileClass}>{content}</div>
    </li>
  );
}

export function MobileActionDashboard({ data }: MobileActionDashboardProps) {
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();

  const recommendations = useMemo(
    () => buildOfficePriorityRecommendations(data),
    [data],
  );
  const coveredQueues = useMemo(
    () => getAltairCoveredQueueTypes(data),
    [data],
  );
  const allCards = useMemo(() => buildMobileActionCards(data), [data]);
  const cards = useMemo(() => {
    if (recommendations.length === 0) {
      return allCards;
    }

    return allCards.filter(
      (card) => !isCoveredByAltairRecommendations(card.queueType, coveredQueues),
    );
  }, [allCards, coveredQueues, recommendations.length]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);
  const visibleCards = cards.slice(0, VISIBLE_CARD_LIMIT);
  const hiddenCount = cards.length - visibleCards.length;
  const hasAltairPriorities = recommendations.length > 0;

  return (
    <>
      <section aria-label="Action queue" className="min-w-0">
        <header className="mb-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Action Queue</h2>
            {hasAltairPriorities ? (
              <p className="text-[11px] text-slate-500">Other open queues</p>
            ) : null}
          </div>
          {cards.length > 0 ? (
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {cards.length} item{cards.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </header>

        {cards.length === 0 ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-900">
              {allCards.length === 0
                ? "Queue empty — nothing pending right now"
                : "Top priorities are listed above"}
            </p>
          </div>
        ) : (
          <div>
            <ul className="grid grid-cols-2 gap-1.5">
              {visibleCards.map((card) => (
                <MobileActionTile
                  key={card.id}
                  card={card}
                  onOpenSheet={setActiveCard}
                />
              ))}
            </ul>

            {hiddenCount > 0 && hasPanel("attention") ? (
              <button
                type="button"
                onClick={() => openDashboardPanel("attention")}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View all {cards.length} items
                <MobileActionCardChevron />
              </button>
            ) : null}
          </div>
        )}
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
