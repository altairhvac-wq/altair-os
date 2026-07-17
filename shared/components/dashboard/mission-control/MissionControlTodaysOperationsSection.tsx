import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlOperationsCard,
} from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";
import { MissionControlMetricTile } from "./MissionControlMetricTile";
import { MissionControlInlineEmptyState } from "./MissionControlInlineEmptyState";

type MissionControlTodaysOperationsSectionProps = {
  cards: MissionControlOperationsCard[];
};

export function MissionControlTodaysOperationsSection({
  cards,
}: MissionControlTodaysOperationsSectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.todaysOperations}
      description="Live field and office activity for today."
      density="compact"
      headerVariant="spacious"
    >
      {cards.length === 0 ? (
        <MissionControlInlineEmptyState
          title="Today's schedule is clear."
          description="Scheduled jobs and crew activity will appear here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
          {cards.map((card) => (
            <MissionControlMetricTile key={card.id} {...card} />
          ))}
        </div>
      )}
    </MasterPageSection>
  );
}
