import { Button } from "@/shared/design-system/components";
import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlQuickAction,
} from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";

type MissionControlQuickActionsSectionProps = {
  actions: MissionControlQuickAction[];
};

export function MissionControlQuickActionsSection({
  actions,
}: MissionControlQuickActionsSectionProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.quickActions}
      description="Common office workflows in one tap."
      density="compact"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            href={action.href}
            variant="secondary"
            className="h-auto min-h-[3.5rem] w-full flex-col items-start gap-1 px-4 py-3 text-left sm:min-h-[4rem]"
          >
            <span className="text-sm font-bold text-slate-900">{action.label}</span>
            <span className="text-xs font-normal text-slate-500">
              {action.description}
            </span>
          </Button>
        ))}
      </div>
    </MasterPageSection>
  );
}
