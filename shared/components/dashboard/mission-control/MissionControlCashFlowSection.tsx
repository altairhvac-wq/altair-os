import Link from "next/link";
import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlCashFlowCard,
} from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";

type MissionControlCashFlowSectionProps = {
  cards: MissionControlCashFlowCard[];
};

export function MissionControlCashFlowSection({
  cards,
}: MissionControlCashFlowSectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.cashFlow}
      description="Outstanding balances and collected revenue."
      density="compact"
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="admin-metric-card admin-metric-card-interactive block border-slate-100 bg-white"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-900 lg:mt-2 lg:text-2xl">
              {card.value}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 lg:mt-1 lg:text-xs">
              {card.trend}
            </p>
          </Link>
        ))}
      </div>
    </MasterPageSection>
  );
}
