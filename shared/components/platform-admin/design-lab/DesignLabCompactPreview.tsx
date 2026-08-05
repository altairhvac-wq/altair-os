import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DesignLabTokenAnchor } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import {
  DESIGN_LAB_COLOR_FIELDS,
  DESIGN_LAB_CSS_VAR_BY_KEY,
  type DesignLabColorKey,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
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
  getDesignLabTokenPaintRole,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import { altairMcTileClass } from "@/shared/design-system/components";

type DesignLabCompactPreviewProps = {
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

export function DesignLabCompactPreview({
  colors,
  shines = {},
  dimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  selectedTargetId,
  onSelectTarget,
}: DesignLabCompactPreviewProps) {
  return (
    <div
      className="design-lab-preview p-4 sm:p-5"
      style={{
        ...DESIGN_LAB_OPACITY_CHECKER_STYLE,
        ...designLabPreviewVars(colors, shines, dimensions),
      }}
    >
      {/*
        Flat sibling edit targets — do not nest chrome-shell around sidebar /
        topbar / content-well (parent :hover outline bleeds across children).
      */}
      <div className="overflow-hidden rounded-none">
        <div className="flex min-h-[16rem]">
          <DesignLabTokenAnchor
            tokenKey="northStarRoot"
            className="hidden w-2 shrink-0 sm:block"
          >
            <DesignLabEditableTarget
              targetId="chrome-shell"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              className="h-full w-full"
              style={designLabFillStyle("--north-star-root")}
              aria-label="Page canvas"
            />
          </DesignLabTokenAnchor>

          <DesignLabTokenAnchor
            tokenKey="northStarSidebar"
            className="hidden sm:block"
          >
            <DesignLabEditableTarget
              targetId="sidebar-shell"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              className="h-full w-36 shrink-0 p-3"
              style={designLabFillStyle("--north-star-sidebar")}
            >
              <DesignLabTokenAnchor
                tokenKey="northStarSidebarLabel"
                as="p"
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--north-star-sidebar-label)" }}
              >
                Navigate
              </DesignLabTokenAnchor>
              <DesignLabTokenAnchor
                tokenKey="northStarSidebarLinkActive"
                as="p"
                className="mt-2 text-sm font-medium"
                style={{ color: "var(--north-star-sidebar-link-active)" }}
              >
                Dashboard
              </DesignLabTokenAnchor>
              <DesignLabTokenAnchor
                tokenKey="northStarSidebarLink"
                as="p"
                className="mt-1 text-sm"
                style={{ color: "var(--north-star-sidebar-link)" }}
              >
                Customers
              </DesignLabTokenAnchor>
            </DesignLabEditableTarget>
          </DesignLabTokenAnchor>

          <DesignLabTokenAnchor
            tokenKey="northStarBorder"
            className="hidden w-1 shrink-0 sm:block"
          >
            <DesignLabEditableTarget
              targetId="chrome-border"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              className="h-full w-full"
              style={designLabFillStyle("--north-star-border")}
              aria-label="Chrome border"
            />
          </DesignLabTokenAnchor>

          <div className="min-w-0 flex-1">
            <DesignLabTokenAnchor tokenKey="northStarTopbar" className="block">
              <DesignLabEditableTarget
                targetId="topbar-shell"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                className="px-3 py-2.5"
                style={designLabFillStyle("--north-star-topbar")}
              >
                <DesignLabTokenAnchor
                  tokenKey="northStarTextLight"
                  as="p"
                  className="text-sm font-bold"
                  style={{ color: "var(--north-star-text-light)" }}
                >
                  Dashboard
                </DesignLabTokenAnchor>
                <DesignLabTokenAnchor
                  tokenKey="northStarTextLightMuted"
                  as="p"
                  className="text-xs"
                  style={{ color: "var(--north-star-text-light-muted)" }}
                >
                  Live chrome token preview
                </DesignLabTokenAnchor>
              </DesignLabEditableTarget>
            </DesignLabTokenAnchor>

            <DesignLabTokenAnchor
              tokenKey="northStarBrassRing"
              className="block h-0.5"
            >
              <DesignLabEditableTarget
                targetId="brass-ladder"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                className="h-full w-full"
                style={designLabFillStyle("--north-star-brass-ring")}
                aria-label="Brass ring divider"
              />
            </DesignLabTokenAnchor>

            <DesignLabTokenAnchor
              tokenKey="northStarContentWell"
              className="block"
            >
              <DesignLabEditableTarget
                targetId="content-well"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                className="space-y-3 p-3"
                style={designLabFillStyle("--north-star-content-well")}
              >
                <DesignLabEditableTarget
                  targetId="status-colors"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="grid grid-cols-3 gap-2"
                >
                  {(
                    [
                      ["Low", "altairPaper", "altairSuccess"],
                      ["Med", "altairWarningSurface", "altairWarning"],
                      ["High", "altairDangerSurface", "altairDanger"],
                    ] as const satisfies ReadonlyArray<
                      readonly [string, DesignLabColorKey, DesignLabColorKey]
                    >
                  ).map(([label, shellKey, accentKey]) => (
                    <DesignLabTokenAnchor
                      key={label}
                      tokenKey={shellKey}
                      className="rounded-xl border border-black/5 p-2 shadow-sm"
                      style={designLabFillStyle(
                        DESIGN_LAB_CSS_VAR_BY_KEY[shellKey],
                      )}
                    >
                      <DesignLabTokenAnchor
                        tokenKey={accentKey}
                        as="span"
                        className="mb-1 inline-block h-2.5 w-2.5 rounded-full"
                        style={designLabFillStyle(
                          DESIGN_LAB_CSS_VAR_BY_KEY[accentKey],
                        )}
                      />
                      <p
                        className="text-[10px] font-semibold"
                        style={{ color: "var(--altair-ink)" }}
                      >
                        {label}
                      </p>
                    </DesignLabTokenAnchor>
                  ))}
                </DesignLabEditableTarget>

                <div className="grid grid-cols-2 gap-2">
                  <DesignLabTokenAnchor tokenKey="surfaceTile" className="block">
                    <DesignLabEditableTarget
                      targetId="surface-hierarchy"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className={altairMcTileClass}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-muted">
                        Sharp tile
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-altair-ink">
                        rounded-none · hairline
                      </p>
                    </DesignLabEditableTarget>
                  </DesignLabTokenAnchor>

                  <DesignLabTokenAnchor
                    tokenKey="northStarPanel"
                    className="block"
                  >
                    <DesignLabEditableTarget
                      targetId="chrome-panel"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className="rounded-none border p-2"
                      style={{
                        ...designLabFillStyle("--north-star-panel"),
                        borderColor: "var(--north-star-border)",
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{ color: "var(--north-star-text-light)" }}
                      >
                        Chrome panel
                      </p>
                    </DesignLabEditableTarget>
                  </DesignLabTokenAnchor>
                </div>

                <div className="flex gap-1.5">
                  {(
                    [
                      ["border-subtle", "borderSubtle", "--border-subtle"],
                      ["border-strong", "borderStrong", "--border-strong"],
                      ["altair-border", "altairBorder", "--altair-border"],
                      [
                        "altair-border-strong",
                        "altairBorderStrong",
                        "--altair-border-strong",
                      ],
                    ] as const satisfies ReadonlyArray<
                      readonly [
                        DesignLabEditTargetId,
                        DesignLabColorKey,
                        string,
                      ]
                    >
                  ).map(([targetId, tokenKey, cssVar]) => (
                    <DesignLabTokenAnchor
                      key={targetId}
                      tokenKey={tokenKey}
                      className="min-w-0 flex-1"
                    >
                      <DesignLabEditableTarget
                        targetId={targetId}
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        className="flex h-8 items-center justify-center rounded-none border-2 bg-[rgba(251,247,239,0.85)]"
                        style={{ borderColor: `var(${cssVar})` }}
                        aria-label={tokenKey}
                      >
                        <span className="truncate px-0.5 font-mono text-[8px] font-semibold text-[#17130E]/80">
                          {tokenKey.replace(/^(border|altair|northStar)/, "").slice(0, 6) ||
                            tokenKey.slice(0, 6)}
                        </span>
                      </DesignLabEditableTarget>
                    </DesignLabTokenAnchor>
                  ))}
                </div>

                <DesignLabTokenAnchor
                  tokenKey="northStarWorkSurface"
                  className="block"
                >
                  <DesignLabEditableTarget
                    targetId="hub-work-tables"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    className="overflow-hidden rounded-none"
                    style={designLabFillStyle("--north-star-work-surface")}
                  >
                    <DesignLabEditableTarget
                      targetId="work-border"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className="border-b px-2 py-1.5"
                      style={{
                        ...designLabFillStyle("--north-star-work-band"),
                        borderColor: "var(--north-star-work-border)",
                        color: "var(--north-star-work-text-secondary)",
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                        Work band
                      </p>
                    </DesignLabEditableTarget>
                    <div
                      className="px-2 py-1.5 text-[11px]"
                      style={{
                        ...designLabFillStyle("--north-star-work-row"),
                        color: "var(--north-star-work-text)",
                      }}
                    >
                      Table row
                    </div>
                    <DesignLabEditableTarget
                      targetId="work-border-strong"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className="m-1.5 rounded-none border px-2 py-1 text-[11px]"
                      style={{
                        ...designLabFillStyle("--north-star-work-input"),
                        borderColor: "var(--north-star-work-border-strong)",
                        color: "var(--north-star-work-placeholder)",
                      }}
                    >
                      Filter input
                    </DesignLabEditableTarget>
                  </DesignLabEditableTarget>
                </DesignLabTokenAnchor>

                <DesignLabEditableTarget
                  targetId="brass-ladder"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="flex gap-1.5"
                >
                  {(
                    [
                      ["northStarBronze", "--north-star-bronze"],
                      ["northStarBrass", "--north-star-brass"],
                      ["northStarGold", "--north-star-gold"],
                      ["northStarChampagne", "--north-star-champagne"],
                    ] as const
                  ).map(([key, cssVar]) => (
                    <DesignLabTokenAnchor
                      key={cssVar}
                      tokenKey={key}
                      as="span"
                      className="h-6 flex-1 rounded-none border border-black/10"
                      style={designLabFillStyle(cssVar)}
                    >
                      <span className="sr-only">{key}</span>
                    </DesignLabTokenAnchor>
                  ))}
                </DesignLabEditableTarget>
              </DesignLabEditableTarget>
            </DesignLabTokenAnchor>
          </div>
        </div>
      </div>

      {/* Every token gets an anchor so inspector focus always spotlights something. */}
      <div
        className="mt-3 rounded-none border border-[rgba(23,19,14,0.12)] bg-[rgba(251,247,239,0.92)] p-2"
        aria-label="All token spotlight anchors"
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]">
          Token anchors · sample
        </p>
        <div className="flex flex-wrap gap-1">
          {DESIGN_LAB_COLOR_FIELDS.map(({ key, cssVar, label }) => {
            const role = getDesignLabTokenPaintRole(key);
            /* Swatches always paint as fills so every token (incl. ink) is visible
               and shine companions read clearly; ink/stroke roles still apply in
               product chrome via their dedicated consumers. */
            const style =
              role === "stroke"
                ? {
                    borderWidth: 2,
                    borderStyle: "solid" as const,
                    borderColor: `var(${cssVar})`,
                    borderImageSource: `var(${cssVar}--shine, none)`,
                    borderImageSlice: 1,
                    backgroundColor: "rgba(251,247,239,0.8)",
                  }
                : designLabFillStyle(cssVar);

            return (
              <DesignLabTokenAnchor
                key={key}
                tokenKey={key}
                as="span"
                title={label}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-black/10 px-1 font-mono text-[8px] font-semibold text-[#17130E]/80"
                style={style}
              >
                {label.slice(0, 2)}
              </DesignLabTokenAnchor>
            );
          })}
        </div>
      </div>
    </div>
  );
}
