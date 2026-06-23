import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DashboardSurfaceId } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import { getDashboardSurfaceLabel } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import { getDesignLabEditTarget } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";

export type DesignLabCanvasSelection =
  | { kind: "global"; targetId: DesignLabEditTargetId }
  | { kind: "surface"; surfaceId: DashboardSurfaceId };

export function getCanvasSelectionLabel(
  selection: DesignLabCanvasSelection | null,
): string | null {
  if (!selection) {
    return null;
  }

  if (selection.kind === "global") {
    return getDesignLabEditTarget(selection.targetId)?.label ?? selection.targetId;
  }

  return getDashboardSurfaceLabel(selection.surfaceId);
}

export function isGlobalTargetSelected(
  selection: DesignLabCanvasSelection | null,
  targetId: DesignLabEditTargetId,
): boolean {
  return selection?.kind === "global" && selection.targetId === targetId;
}

export function isSurfaceSelected(
  selection: DesignLabCanvasSelection | null,
  surfaceId: DashboardSurfaceId,
): boolean {
  return selection?.kind === "surface" && selection.surfaceId === surfaceId;
}

export function globalSelectionId(
  selection: DesignLabCanvasSelection | null,
): DesignLabEditTargetId | null {
  return selection?.kind === "global" ? selection.targetId : null;
}
