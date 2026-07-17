import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlCashFlowCard,
} from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";
import { MissionControlMetricTile } from "./MissionControlMetricTile";

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
      headerVariant="spacious"
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <MissionControlMetricTile
            key={card.id}
            label={card.label}
            value={card.value}
            trend={card.trend}
            icon={card.icon}
            href={card.href}
            tone={card.tone}
          />
        ))}
      </div>
    </MasterPageSection>
  );
}
