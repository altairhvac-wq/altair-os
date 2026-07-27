import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlCashFlowCard,
  type MissionControlChartSeries,
} from "@/shared/lib/dashboard-mission-control";
import {
  MasterPageSection,
  altairSurfaceSectionBodyClass,
  altairSurfaceSectionClass,
} from "@/shared/design-system/shell";
import { MissionControlMetricCell } from "./MissionControlMetricCell";
import { MissionControlInlineTrend } from "./MissionControlInlineTrend";

type MissionControlCashFlowSectionProps = {
  cards: MissionControlCashFlowCard[];
  collectionsTrend?: MissionControlChartSeries;
};

export function MissionControlCashFlowSection({
  cards,
  collectionsTrend,
}: MissionControlCashFlowSectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.cashFlow}
      density="compact"
      headerVariant="spacious"
    >
      <div className={`${altairSurfaceSectionClass} ${altairSurfaceSectionBodyClass}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-8 sm:gap-y-6 lg:grid-cols-4">
          {cards.map((card) => (
            <MissionControlMetricCell
              key={card.id}
              label={card.label}
              value={card.value}
              detail={card.trend}
              href={card.href}
              tone={card.tone}
            />
          ))}
        </div>
        {collectionsTrend ? (
          <MissionControlInlineTrend series={collectionsTrend} />
        ) : null}
      </div>
    </MasterPageSection>
  );
}
