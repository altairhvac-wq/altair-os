import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DesignLabTokenAnchor } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import { designLabFillStyle } from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import { altairMcCardClass, altairMcCardPadClass, altairMcTileClass } from "@/shared/design-system/components";

type DesignLabWorkspaceDemoProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
  subtitle: string;
  layout?: "embedded" | "canvas";
};

const SUMMARY_CARDS = [
  { label: "Open jobs", value: "12" },
  { label: "Awaiting invoice", value: "4" },
  { label: "Needs follow-up", value: "3" },
  { label: "Capacity", value: "78%" },
] as const;

export function DesignLabWorkspaceDemo({
  selectedTargetId,
  onSelectTarget,
  subtitle,
  layout = "embedded",
}: DesignLabWorkspaceDemoProps) {
  const isCanvas = layout === "canvas";
  const summaryGridClass = isCanvas
    ? "mt-6 grid gap-0 sm:grid-cols-2 xl:grid-cols-4"
    : "mt-5 grid gap-0 sm:grid-cols-2 lg:grid-cols-4";
  const titleClass = isCanvas
    ? "text-2xl font-bold sm:text-3xl"
    : "text-xl font-bold sm:text-2xl";

  return (
    <>
      <DesignLabEditableTarget
        targetId="header-strip"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        className="admin-page-header px-3.5 py-3"
        style={designLabFillStyle("--north-star-header-strip")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <DesignLabEditableTarget
              targetId="topbar-heading"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="h3"
              className={titleClass}
              style={{ color: "var(--north-star-topbar-heading)" }}
              aria-label="Edit topbar heading · hub title"
            >
              Today&apos;s Work
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="topbar-subcopy"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="max-w-2xl text-sm"
              style={{ color: "var(--north-star-topbar-subcopy)" }}
              aria-label="Edit topbar subcopy · hub helper"
            >
              {subtitle}
            </DesignLabEditableTarget>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <DesignLabTokenAnchor tokenKey="northStarBrass" as="span">
              <DesignLabEditableTarget
                targetId="brass-ladder"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="button"
                className="rounded-none px-3.5 py-2 text-sm font-semibold"
                style={{
                  ...designLabFillStyle("--north-star-brass"),
                  color: "var(--north-star-text-dark)",
                }}
              >
                Dispatch board
              </DesignLabEditableTarget>
            </DesignLabTokenAnchor>
            <DesignLabEditableTarget
              targetId="altair-materials"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="button"
              className="rounded-none px-3.5 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--altair-paper)",
                color: "var(--altair-ink)",
              }}
            >
              New job
            </DesignLabEditableTarget>
          </div>
        </div>
      </DesignLabEditableTarget>

      <DesignLabEditableTarget
        targetId="chrome-border"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        className="h-px w-full"
        style={designLabFillStyle("--north-star-border")}
        aria-label="Chrome border"
      />

      <div className={summaryGridClass}>
        {SUMMARY_CARDS.map((card) => (
          <DesignLabEditableTarget
            key={card.label}
            targetId="surface-hierarchy"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className={altairMcTileClass}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-muted">
              {card.label}
            </p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-altair-ink">
              {card.value}
            </p>
          </DesignLabEditableTarget>
        ))}
      </div>

      <div className="mt-4 grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <DesignLabEditableTarget
          targetId="surface-hierarchy"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          className={altairMcCardClass}
        >
          <div className={altairMcCardPadClass}>
            <p className="text-sm font-semibold text-altair-ink">Work queue</p>
            <p className="mt-0.5 text-xs text-altair-ink-muted">
              Sharp hairline plates — hub language.
            </p>
          </div>
          <DesignLabEditableTarget
            targetId="altair-border"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="h-px w-full"
            style={{ backgroundColor: "var(--altair-border)" }}
            aria-label="Altair border"
          />
          <ul>
            {[
              "AC diagnostic — Layton",
              "Furnace tune-up — Ogden",
              "Estimate follow-up — Clearfield",
            ].map((title, index) => (
              <li key={title}>
                {index > 0 ? (
                  <DesignLabEditableTarget
                    targetId="altair-border"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    className="h-px w-full"
                    style={{ backgroundColor: "var(--altair-border)" }}
                    aria-label="Altair border divider"
                  />
                ) : null}
                <div className={`${altairMcCardPadClass} text-sm text-altair-ink`}>
                  {title}
                </div>
              </li>
            ))}
          </ul>
        </DesignLabEditableTarget>

        <DesignLabEditableTarget
          targetId="altair-status"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          className={`${altairMcCardClass} ${altairMcCardPadClass}`}
        >
          <p className="text-sm font-semibold text-altair-ink">Status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DesignLabTokenAnchor
              tokenKey="altairSuccessSurface"
              as="span"
              className="rounded-none px-2 py-1 text-[11px] font-semibold"
              style={{
                ...designLabFillStyle("--altair-success-surface"),
                color: "var(--altair-success-foreground)",
              }}
            >
              Success
            </DesignLabTokenAnchor>
            <DesignLabTokenAnchor
              tokenKey="altairWarningSurface"
              as="span"
              className="rounded-none px-2 py-1 text-[11px] font-semibold"
              style={{
                ...designLabFillStyle("--altair-warning-surface"),
                color: "var(--altair-warning-foreground)",
              }}
            >
              Warning
            </DesignLabTokenAnchor>
            <DesignLabTokenAnchor
              tokenKey="altairDangerSurface"
              as="span"
              className="rounded-none px-2 py-1 text-[11px] font-semibold"
              style={{
                ...designLabFillStyle("--altair-danger-surface"),
                color: "var(--altair-danger-foreground)",
              }}
            >
              Danger
            </DesignLabTokenAnchor>
            <DesignLabTokenAnchor
              tokenKey="altairInformationSurface"
              as="span"
              className="rounded-none px-2 py-1 text-[11px] font-semibold"
              style={{
                ...designLabFillStyle("--altair-information-surface"),
                color: "var(--altair-information-foreground)",
              }}
            >
              Information
            </DesignLabTokenAnchor>
          </div>
        </DesignLabEditableTarget>
      </div>
    </>
  );
}
