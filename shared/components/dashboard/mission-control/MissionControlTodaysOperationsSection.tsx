import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlOperationsCard,
} from "@/shared/lib/dashboard-mission-control";
import {
  MasterPageSection,
  altairSurfaceSectionBodyClass,
  altairSurfaceSectionClass,
} from "@/shared/design-system/shell";
import { MissionControlMetricCell } from "./MissionControlMetricCell";
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
      density="compact"
      headerVariant="spacious"
    >
      {cards.length === 0 ? (
        <MissionControlInlineEmptyState
          title="Today's schedule is clear."
          description="Scheduled jobs and crew activity will appear here."
        />
      ) : (
        <div className={`${altairSurfaceSectionClass} ${altairSurfaceSectionBodyClass}`}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:gap-x-6 sm:gap-y-5">
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
        </div>
      )}
    </MasterPageSection>
  );
}
