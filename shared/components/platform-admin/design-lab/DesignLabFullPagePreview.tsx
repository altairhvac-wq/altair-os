import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DesignLabWorkspaceDemo } from "@/shared/components/platform-admin/design-lab/DesignLabWorkspaceDemo";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import {
  DESIGN_LAB_OPACITY_CHECKER_STYLE,
  designLabPreviewVars,
} from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import {
  designLabFillStyle,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

type DesignLabFullPagePreviewProps = {
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

export function DesignLabFullPagePreview({
  colors,
  shines = {},
  dimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  selectedTargetId,
  onSelectTarget,
}: DesignLabFullPagePreviewProps) {
  return (
    <div
      className="design-lab-preview min-h-[32rem] p-3 sm:p-4"
      style={{
        ...DESIGN_LAB_OPACITY_CHECKER_STYLE,
        ...designLabPreviewVars(colors, shines, dimensions),
      }}
    >
      <DesignLabEditableTarget
        targetId="content-well"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        className="overflow-hidden rounded-none"
        style={designLabFillStyle("--north-star-content-well")}
      >
        <DesignLabWorkspaceDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          subtitle="Hub-style sharp plates on the two-tone content well — matches today's live chrome structure."
          layout="embedded"
        />
      </DesignLabEditableTarget>
    </div>
  );
}
