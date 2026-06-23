import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DesignLabWorkspaceDemo } from "@/shared/components/platform-admin/design-lab/DesignLabWorkspaceDemo";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";

type DesignLabFullPagePreviewProps = {
  colors: DesignLabColors;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

export function DesignLabFullPagePreview({
  colors,
  selectedTargetId,
  onSelectTarget,
}: DesignLabFullPagePreviewProps) {
  return (
    <div
      className="design-lab-preview min-h-[32rem] p-3 sm:p-4"
      style={designLabPreviewVars(colors)}
    >
      <DesignLabEditableTarget
        targetId="page-background"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        className="rounded-[0.875rem] p-4 sm:p-5 lg:p-6"
        style={{ backgroundColor: "var(--dl-page-bg)" }}
      >
        <DesignLabWorkspaceDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          subtitle="A preview of how this palette feels across an Altair workspace."
          layout="embedded"
        />
      </DesignLabEditableTarget>
    </div>
  );
}
