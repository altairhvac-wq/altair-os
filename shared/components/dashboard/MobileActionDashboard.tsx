"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import {
  MobileActionCardChevron,
  MobileActionSheet,
  MOBILE_ACTION_QUIET_TILE,
  MOBILE_ACTION_SEVERITY_STYLES,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionSheet";
import {
  buildMobileActionCards,
  buildMobileActionSheetData,
  type MobileActionCard,
  type MobileActionCategory,
} from "@/shared/lib/mobile-action-dashboard";
import type { DashboardData } from "@/shared/types/dashboard";

type MobileActionDashboardProps = {
  data: DashboardData;
};

const CATEGORY_LABELS: Partial<Record<MobileActionCategory, string>> = {
  "critical-operations": "Critical",
  "money-actions": "Money",
  "quiet-summary": "Summary",
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
    <>
      <div className="flex items-start justify-between gap-1">
        <Icon
          className={`h-3 w-3 shrink-0 ${isQuiet ? "text-slate-400" : styles.iconClass}`}
          aria-hidden="true"
        />
        <MobileActionCardChevron />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end">
        <span
          className={`text-2xl font-black tabular-nums leading-none tracking-tight ${
            isQuiet ? "text-slate-700" : styles.count
          }`}
        >
          {card.count}
        </span>
        <span
          className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-tight ${
            isQuiet ? "text-slate-500" : "text-slate-800"
          }`}
        >
          {card.label}
        </span>
      </div>
    </>
  );

  const tileClass = `flex aspect-square w-full flex-col rounded-xl border p-2.5 text-left transition-colors hover:bg-slate-50/80 active:scale-[0.98] ${
    isQuiet ? MOBILE_ACTION_QUIET_TILE : styles.tile
  }`;

  if (card.sheetType) {
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

function groupCardsByCategory(
  cards: MobileActionCard[],
): { category: MobileActionCategory; cards: MobileActionCard[] }[] {
  const groups = new Map<MobileActionCategory, MobileActionCard[]>();

  for (const card of cards) {
    const existing = groups.get(card.category) ?? [];
    existing.push(card);
    groups.set(card.category, existing);
  }

  const order: MobileActionCategory[] = [
    "critical-operations",
    "money-actions",
    "today-operations",
    "quiet-summary",
  ];

  return order
    .filter((category) => groups.has(category))
    .map((category) => ({
      category,
      cards: groups.get(category)!,
    }));
}

export function MobileActionDashboard({ data }: MobileActionDashboardProps) {
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();

  const cards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);
  const visibleCards = cards.slice(0, VISIBLE_CARD_LIMIT);
  const hiddenCount = cards.length - visibleCards.length;
  const groupedCards = groupCardsByCategory(visibleCards);

  return (
    <>
      <section aria-label="Action queue" className="min-w-0 flex-1">
        <header className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
            Action queue
          </h2>
          {cards.length > 0 ? (
            <span className="text-[10px] font-semibold text-slate-500">
              {cards.length} item{cards.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </header>

        {cards.length === 0 ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
            <p className="text-xs font-semibold text-emerald-900">
              All clear — nothing needs action right now
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedCards.map(({ category, cards: categoryCards }) => (
              <div key={category}>
                {CATEGORY_LABELS[category] ? (
                  <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABELS[category]}
                  </p>
                ) : null}
                <ul className="grid grid-cols-2 gap-2">
                  {categoryCards.map((card) => (
                    <MobileActionTile
                      key={card.id}
                      card={card}
                      onOpenSheet={setActiveCard}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {hiddenCount > 0 && hasPanel("attention") ? (
              <button
                type="button"
                onClick={() => openDashboardPanel("attention")}
                className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View all {cards.length} items
                <MobileActionCardChevron />
              </button>
            ) : null}
          </div>
        )}
      </section>

      {activeCard?.sheetType ? (
        <MobileActionSheet
          card={activeCard}
          sheetData={sheetData}
          onClose={() => setActiveCard(null)}
        />
      ) : null}
    </>
  );
}
