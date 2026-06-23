import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";

type DesignLabCompactPreviewProps = {
  colors: DesignLabColors;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

export function DesignLabCompactPreview({
  colors,
  selectedTargetId,
  onSelectTarget,
}: DesignLabCompactPreviewProps) {
  return (
    <div className="design-lab-preview p-4 sm:p-5" style={designLabPreviewVars(colors)}>
      <DesignLabEditableTarget
        targetId="page-background"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        className="rounded-[1rem] p-4 sm:p-5"
        style={{ backgroundColor: "var(--dl-page-bg)" }}
      >
        <div className="space-y-1">
          <DesignLabEditableTarget
            targetId="header-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="h3"
            className="text-lg font-bold"
            style={{ color: "var(--dl-heading-text)" }}
          >
            Service dashboard
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="muted-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="text-sm"
            style={{ color: "var(--dl-muted-text)" }}
          >
            Preview shell for headings, cards, and actions.
          </DesignLabEditableTarget>
        </div>

        <DesignLabEditableTarget
          targetId="card-surface"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          className="mt-4 rounded-[0.875rem] border p-4"
          style={{
            backgroundColor: "var(--dl-card-bg)",
            borderColor: "var(--dl-card-border)",
          }}
        >
          <DesignLabEditableTarget
            targetId="body-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="h4"
            className="text-base font-semibold"
            style={{ color: "var(--dl-body-text)" }}
          >
            Today&apos;s jobs
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="body-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="mt-1 text-sm"
            style={{ color: "var(--dl-body-text)" }}
          >
            Body text shows how readable copy feels on card surfaces.
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="muted-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="mt-1 text-xs"
            style={{ color: "var(--dl-muted-text)" }}
          >
            Muted text for timestamps, metadata, and helper lines.
          </DesignLabEditableTarget>

          <DesignLabEditableTarget
            targetId="card-surface"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="mt-3 rounded-lg border p-3"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="text-sm font-medium"
              style={{ color: "var(--dl-body-text)" }}
            >
              Nested section
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="mt-1 text-xs"
              style={{ color: "var(--dl-muted-text)" }}
            >
              A smaller card inside the main surface.
            </DesignLabEditableTarget>
          </DesignLabEditableTarget>

          <div className="mt-4 flex flex-wrap gap-2">
            <DesignLabEditableTarget
              targetId="primary-action"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="button"
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-primary-bg)",
                color: "var(--dl-primary-text)",
              }}
            >
              Primary action
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="secondary-action"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="button"
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-secondary-bg)",
                color: "var(--dl-secondary-text)",
              }}
            >
              Secondary action
            </DesignLabEditableTarget>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <DesignLabEditableTarget
              targetId="success-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-success-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Success
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="warning-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-warning-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Warning
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="danger-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-danger-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Danger
            </DesignLabEditableTarget>
          </div>
        </DesignLabEditableTarget>

        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-3 text-[11px]"
          style={{ color: "var(--dl-muted-text)" }}
        >
          Preview CSS variables are scoped to this panel only.
        </DesignLabEditableTarget>
      </DesignLabEditableTarget>
    </div>
  );
}
