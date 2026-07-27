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
      description="Less frequent workflows, one tap away."
      density="compact"
      headerVariant="spacious"
    >
      <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            href={action.href}
            variant="quiet"
            className="h-auto min-h-[3rem] w-full flex-col items-start gap-0.5 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-[var(--border-subtle)] hover:bg-[var(--surface-tile)] sm:min-h-[3.25rem]"
          >
            <span className="flex items-center gap-2">
              <action.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">{action.label}</span>
            </span>
            <span className="pl-6 text-xs font-normal text-slate-500">
              {action.description}
            </span>
          </Button>
        ))}
      </div>
    </MasterPageSection>
  );
}
