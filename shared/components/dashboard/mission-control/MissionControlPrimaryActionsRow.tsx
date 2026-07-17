import { Button } from "@/shared/design-system/components";
import type { MissionControlQuickAction } from "@/shared/lib/dashboard-mission-control";

type MissionControlPrimaryActionsRowProps = {
  actions: MissionControlQuickAction[];
};

/**
 * Compact, always-visible row of the highest-frequency create actions. Lives
 * directly under the greeting so the most common workflows never require a
 * scroll — the full Quick Actions section further down covers the rest.
 */
export function MissionControlPrimaryActionsRow({
  actions,
}: MissionControlPrimaryActionsRowProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Primary quick actions"
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          href={action.href}
          variant="secondary"
          size="sm"
          leadingIcon={<action.icon className="h-3.5 w-3.5" aria-hidden="true" />}
          className="rounded-lg"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
