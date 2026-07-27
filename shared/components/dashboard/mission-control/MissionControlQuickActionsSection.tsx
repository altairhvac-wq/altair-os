import Link from "next/link";
import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionControlQuickAction,
} from "@/shared/lib/dashboard-mission-control";
import { MasterPageSection } from "@/shared/design-system/shell";

type MissionControlQuickActionsSectionProps = {
  actions: MissionControlQuickAction[];
};

/**
 * Compact shortcut row — secondary to operational briefing, not oversized action cards.
 */
export function MissionControlQuickActionsSection({
  actions,
}: MissionControlQuickActionsSectionProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.quickActions}
      density="compact"
      headerVariant="spacious"
    >
      <div
        className="flex flex-wrap gap-x-1 gap-y-1"
        role="group"
        aria-label={MISSION_CONTROL_SECTION_LABELS.quickActions}
      >
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200/50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
          >
            <span aria-hidden="true" className="text-slate-400">
              +
            </span>
            <span>{action.shortLabel ?? action.label}</span>
          </Link>
        ))}
      </div>
    </MasterPageSection>
  );
}
