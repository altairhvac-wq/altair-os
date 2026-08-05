"use client";

import { useMemo, useState } from "react";
import {
  DESIGN_LAB_COLOR_FIELDS,
  DESIGN_LAB_TOKEN_GROUPS,
  LIVE_CHROME_DESIGN_LAB_DEFAULTS,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { DesignLabColorControl } from "@/shared/components/platform-admin/design-lab/DesignLabColorControl";
import { DesignLabCompactPreview } from "@/shared/components/platform-admin/design-lab/DesignLabCompactPreview";
import { DesignLabContrastPanel } from "@/shared/components/platform-admin/design-lab/DesignLabContrastPanel";
import { DesignLabCanvasInspector } from "@/shared/components/platform-admin/design-lab/DesignLabCanvasInspector";
import {
  DesignLabCanvasToolbar,
  type DesignLabCanvasTarget,
} from "@/shared/components/platform-admin/design-lab/DesignLabCanvasToolbar";
import { DesignLabEditTargetPanel } from "@/shared/components/platform-admin/design-lab/DesignLabEditTargetPanel";
import { DesignLabExportPanel } from "@/shared/components/platform-admin/design-lab/DesignLabExportPanel";
import { DesignLabFullPageCanvas } from "@/shared/components/platform-admin/design-lab/DesignLabFullPageCanvas";
import { DesignLabFullPagePreview } from "@/shared/components/platform-admin/design-lab/DesignLabFullPagePreview";
import { DesignLabSavedThemesPanel } from "@/shared/components/platform-admin/design-lab/DesignLabSavedThemesPanel";
import { DesignLabSpotlightProvider } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import type { DesignLabCanvasSelection } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import {
  type DesignLabEditTargetId,
} from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import {
  resolveSurfaceStyle,
  type DashboardSurfaceId,
  type DashboardSurfaceOverrides,
  type DashboardSurfaceStyle,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import {
  evaluateDesignLabContrast,
  getContrastOverallStatus,
} from "@/shared/components/platform-admin/design-lab/design-lab-contrast";
import { buildDesignLabThemeExportFromColors } from "@/shared/components/platform-admin/design-lab/design-lab-export";
import { DESIGN_LAB_PRESETS } from "@/shared/components/platform-admin/design-lab/design-lab-presets";
import { DesignLabDimensionControl } from "@/shared/components/platform-admin/design-lab/DesignLabDimensionControl";
import {
  DESIGN_LAB_DIMENSION_DEFS,
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensionKey,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import type {
  DesignLabShine,
  DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import { parseDesignLabThemeTokens } from "@/shared/components/platform-admin/design-lab/design-lab-theme-tokens";
import type { DesignLabTheme } from "@/shared/types/design-lab-theme";

type PreviewMode = "compact" | "full";

type PreviewModeToggleProps = {
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
};

function PreviewModeToggle({ previewMode, onPreviewModeChange }: PreviewModeToggleProps) {
  return (
    <div
      className="flex shrink-0 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] p-0.5"
      role="group"
      aria-label="Preview mode"
    >
      <button
        type="button"
        onClick={() => onPreviewModeChange("compact")}
        aria-pressed={previewMode === "compact"}
        className={[
          "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
          previewMode === "compact"
            ? "bg-[#FFF3D6] text-[#17130E] shadow-[inset_0_0_0_1px_rgba(184,148,63,0.25)]"
            : "text-[#6B6255] hover:text-[#17130E]",
        ].join(" ")}
      >
        Compact
      </button>
      <button
        type="button"
        onClick={() => onPreviewModeChange("full")}
        aria-pressed={previewMode === "full"}
        className={[
          "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
          previewMode === "full"
            ? "bg-[#FFF3D6] text-[#17130E] shadow-[inset_0_0_0_1px_rgba(184,148,63,0.25)]"
            : "text-[#6B6255] hover:text-[#17130E]",
        ].join(" ")}
      >
        Full page
      </button>
    </div>
  );
}

type DesignLabCanvasModeProps = {
  colors: DesignLabColors;
  shines: DesignLabShineMap;
  dimensions: DesignLabDimensions;
  selection: DesignLabCanvasSelection | null;
  surfaceOverrides: DashboardSurfaceOverrides;
  onSelectGlobal: (id: DesignLabEditTargetId) => void;
  onSelectSurface: (surfaceId: DashboardSurfaceId) => void;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
  onShineChange: (
    key: keyof DesignLabColors,
    shine: DesignLabShine | null,
  ) => void;
  onDimensionChange: (key: DesignLabDimensionKey, value: string) => void;
  onSurfaceStyleChange: (
    surfaceId: DashboardSurfaceId,
    field: keyof DashboardSurfaceStyle,
    value: string,
  ) => void;
  onExitCanvas: () => void;
  onReset: () => void;
  activePresetName: string | null;
};

function DesignLabCanvasMode({
  colors,
  shines,
  dimensions,
  selection,
  surfaceOverrides,
  onSelectGlobal,
  onSelectSurface,
  onColorChange,
  onShineChange,
  onDimensionChange,
  onSurfaceStyleChange,
  onExitCanvas,
  onReset,
  activePresetName,
}: DesignLabCanvasModeProps) {
  const [canvasTarget, setCanvasTarget] =
    useState<DesignLabCanvasTarget>("dashboard-replica");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exportState, setExportState] = useState<"idle" | "success" | "error">("idle");

  const readabilityStatus = useMemo(
    () => getContrastOverallStatus(evaluateDesignLabContrast(colors)),
    [colors],
  );

  function handleSelectGlobal(id: DesignLabEditTargetId) {
    onSelectGlobal(id);
    setInspectorOpen(true);
  }

  function handleSelectSurface(surfaceId: DashboardSurfaceId) {
    onSelectSurface(surfaceId);
    setInspectorOpen(true);
  }

  async function handleExport() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(
        buildDesignLabThemeExportFromColors(colors, surfaceOverrides, shines),
      );
      setExportState("success");
      window.setTimeout(() => setExportState("idle"), 2000);
    } catch {
      setExportState("error");
      window.setTimeout(() => setExportState("idle"), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F0E4]">
      <DesignLabCanvasToolbar
        canvasTarget={canvasTarget}
        onCanvasTargetChange={setCanvasTarget}
        activePresetName={activePresetName}
        readabilityStatus={readabilityStatus}
        inspectorOpen={inspectorOpen}
        onInspectorToggle={() => setInspectorOpen((current) => !current)}
        onBack={onExitCanvas}
        onReset={onReset}
        onExport={handleExport}
        exportState={exportState}
      />

      <div
        className={[
          "relative min-h-0 flex-1 overflow-auto",
          inspectorOpen ? "pb-[min(42vh,24rem)]" : "pb-14",
        ].join(" ")}
      >
        <DesignLabFullPageCanvas
          colors={colors}
          shines={shines}
          dimensions={dimensions}
          selection={selection}
          surfaceOverrides={surfaceOverrides}
          onSelectGlobal={handleSelectGlobal}
          onSelectSurface={handleSelectSurface}
          canvasTarget={canvasTarget}
        />

        <DesignLabCanvasInspector
          isOpen={inspectorOpen}
          onOpen={() => setInspectorOpen(true)}
          onClose={() => setInspectorOpen(false)}
          selection={selection}
          colors={colors}
          shines={shines}
          dimensions={dimensions}
          surfaceOverrides={surfaceOverrides}
          onColorChange={onColorChange}
          onShineChange={onShineChange}
          onDimensionChange={onDimensionChange}
          onSurfaceStyleChange={onSurfaceStyleChange}
        />
      </div>
    </div>
  );
}

type DesignLabPageViewProps = {
  initialThemes?: DesignLabTheme[];
};

export function DesignLabPageView({
  initialThemes = [],
}: DesignLabPageViewProps) {
  const [colors, setColors] = useState<DesignLabColors>(
    LIVE_CHROME_DESIGN_LAB_DEFAULTS,
  );
  const [shines, setShines] = useState<DesignLabShineMap>({});
  const [dimensions, setDimensions] = useState<DesignLabDimensions>(
    LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    "live-chrome",
  );
  const [loadedThemeId, setLoadedThemeId] = useState<string | null>(null);
  const [themes, setThemes] = useState<DesignLabTheme[]>(initialThemes);
  const [resetKey, setResetKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("compact");
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const [selectedTargetId, setSelectedTargetId] =
    useState<DesignLabEditTargetId | null>(null);
  const [canvasSelection, setCanvasSelection] =
    useState<DesignLabCanvasSelection | null>(null);
  const [surfaceOverrides, setSurfaceOverrides] =
    useState<DashboardSurfaceOverrides>({});

  function applyPreset(presetId: string) {
    const preset = DESIGN_LAB_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    setColors({ ...preset.colors });
    setShines({});
    setDimensions(LIVE_DESIGN_LAB_DIMENSION_DEFAULTS);
    setActivePresetId(presetId);
    setLoadedThemeId(null);
    setResetKey((current) => current + 1);
    setSurfaceOverrides({});
    setCanvasSelection(null);
  }

  function updateColor(key: keyof DesignLabColors, value: string) {
    setColors((current) => ({ ...current, [key]: value }));
    setActivePresetId(null);
  }

  function updateShine(
    key: keyof DesignLabColors,
    shine: DesignLabShine | null,
  ) {
    setShines((current) => {
      const next = { ...current };
      if (shine) {
        next[key] = shine;
      } else {
        delete next[key];
      }
      return next;
    });
    setActivePresetId(null);
  }

  function updateDimension(key: DesignLabDimensionKey, value: string) {
    setDimensions((current) => ({ ...current, [key]: value }));
    setActivePresetId(null);
  }

  function resetToDefaults() {
    setColors(LIVE_CHROME_DESIGN_LAB_DEFAULTS);
    setShines({});
    setDimensions(LIVE_DESIGN_LAB_DIMENSION_DEFAULTS);
    setActivePresetId("live-chrome");
    setLoadedThemeId(null);
    setResetKey((current) => current + 1);
    setSurfaceOverrides({});
    setCanvasSelection(null);
  }

  function loadSavedTheme(theme: DesignLabTheme) {
    const parsed = parseDesignLabThemeTokens(theme.tokens);
    if (!parsed) {
      return;
    }

    setColors(parsed.colors);
    setShines(parsed.shines);
    setDimensions(parsed.dimensions);
    setActivePresetId(null);
    setLoadedThemeId(theme.id);
    setResetKey((current) => current + 1);
    setSurfaceOverrides({});
    setCanvasSelection(null);
  }

  function handleSelectGlobal(id: DesignLabEditTargetId) {
    setCanvasSelection({ kind: "global", targetId: id });
    setSelectedTargetId(id);
  }

  function handleSelectSurface(surfaceId: DashboardSurfaceId) {
    setCanvasSelection({ kind: "surface", surfaceId });
  }

  function updateSurfaceStyle(
    surfaceId: DashboardSurfaceId,
    field: keyof DashboardSurfaceStyle,
    value: string,
  ) {
    setSurfaceOverrides((current) => {
      const resolved = resolveSurfaceStyle(surfaceId, colors, current);
      return {
        ...current,
        [surfaceId]: {
          ...resolved,
          [field]: value,
        },
      };
    });
    setActivePresetId(null);
  }

  if (isCanvasMode) {
    const activePreset = DESIGN_LAB_PRESETS.find((entry) => entry.id === activePresetId);

    return (
      <DesignLabSpotlightProvider>
        <DesignLabCanvasMode
          colors={colors}
          shines={shines}
          dimensions={dimensions}
          selection={canvasSelection}
          surfaceOverrides={surfaceOverrides}
          onSelectGlobal={handleSelectGlobal}
          onSelectSurface={handleSelectSurface}
          onColorChange={updateColor}
          onShineChange={updateShine}
          onDimensionChange={updateDimension}
          onSurfaceStyleChange={updateSurfaceStyle}
          onExitCanvas={() => setIsCanvasMode(false)}
          onReset={resetToDefaults}
          activePresetName={activePreset?.name ?? null}
        />
      </DesignLabSpotlightProvider>
    );
  }

  return (
    <DesignLabSpotlightProvider>
    <div className="platform-north-star-workspace min-w-0 space-y-4 px-3 pb-16 sm:px-3.5 sm:pb-20 lg:px-5 lg:pb-24">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]">
          Internal
        </p>
        <h1 className="text-2xl font-bold text-[#17130E] sm:text-3xl">Design Lab</h1>
        <p className="max-w-2xl text-sm text-[#6B6255]">
          Founder-only visual controls for Altair. Save company drafts, then explicitly
          apply one to live product chrome for this company — with a confirmation step
          and a one-click revert to default.
        </p>
      </header>

      <section className="rounded-none border border-[rgba(138,99,36,0.16)] bg-[#FBF7EF] px-3.5 py-3 sm:px-4">
        <h2 className="text-sm font-semibold text-[#17130E]">
          Preview · drafts · promote to live
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#4F4638]">
          Token keys match live <span className="font-mono">globals.css</span> / shell
          chrome. Save and Set active only affect Design Lab.{" "}
          <span className="font-semibold text-[#17130E]">Apply to live product</span>{" "}
          injects tokens into the real admin shell for this company&apos;s users.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-3">
          <DesignLabSavedThemesPanel
            themes={themes}
            colors={colors}
            shines={shines}
            dimensions={dimensions}
            loadedThemeId={loadedThemeId}
            onThemesChange={(next) => {
              setThemes(next);
              if (
                loadedThemeId &&
                !next.some((theme) => theme.id === loadedThemeId)
              ) {
                setLoadedThemeId(null);
              }
            }}
            onLoadTheme={loadSavedTheme}
          />

          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-[#17130E]">Preset palettes</h2>
            <p className="text-xs leading-snug text-[#6B6255]">
              Presets only affect this preview. They do not save or change customer
              pages.
            </p>
            <div className="grid gap-2">
              {DESIGN_LAB_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    aria-pressed={isActive}
                    className={[
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-[#B8943F] bg-[#FFF3D6] shadow-[inset_0_0_0_1px_rgba(184,148,63,0.25)]"
                        : "border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F7F0E2]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[#17130E]">
                        {preset.name}
                      </span>
                      <span className="flex shrink-0 gap-1 pt-0.5">
                        <span
                          className="h-3 w-3 rounded-full border border-[rgba(23,19,14,0.12)]"
                          style={{ backgroundColor: preset.colors.northStarSidebar }}
                          aria-hidden
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-[rgba(23,19,14,0.12)]"
                          style={{ backgroundColor: preset.colors.northStarGold }}
                          aria-hidden
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-[rgba(23,19,14,0.12)]"
                          style={{ backgroundColor: preset.colors.altairPaper }}
                          aria-hidden
                        />
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#4F4638]">
                      {preset.purpose}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
                      {preset.mood}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DesignLabEditTargetPanel
            selectedTargetId={selectedTargetId}
            colors={colors}
            shines={shines}
            onColorChange={updateColor}
            onShineChange={updateShine}
          />

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#17130E]">Live token controls</h2>
            <button
              type="button"
              onClick={resetToDefaults}
              className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#6B6255] transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] hover:text-[#17130E]"
            >
              Reset to live chrome
            </button>
          </div>
          <p className="text-xs leading-snug text-[#6B6255]">
            Real CSS variable names from today&apos;s product. Use Saved themes above to
            persist a draft; customer pages stay unchanged.
          </p>
          <div key={resetKey} className="space-y-4">
            {DESIGN_LAB_TOKEN_GROUPS.map((group) => {
              const fields = DESIGN_LAB_COLOR_FIELDS.filter(
                (field) => field.group === group.id,
              );

              return (
                <div key={group.id} className="space-y-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A6324]">
                      {group.label}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
                      {group.helper}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {fields.map(({ key, label, helper, cssVar }) => (
                      <DesignLabColorControl
                        key={key}
                        tokenKey={key}
                        label={label}
                        helper={helper}
                        cssVar={cssVar}
                        value={colors[key]}
                        onChange={(value) => updateColor(key, value)}
                        shine={shines[key] ?? null}
                        onShineChange={(shine) => updateShine(key, shine)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <section
            aria-label="Scoped live preview"
            className="overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.16)] shadow-[0_8px_24px_rgba(23,19,14,0.12)]"
          >
            <div className="border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#17130E]">Live preview</h2>
                  <p className="text-xs text-[#6B6255]">
                    Scoped styles — customer pages are unchanged.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PreviewModeToggle
                    previewMode={previewMode}
                    onPreviewModeChange={setPreviewMode}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCanvasMode(true)}
                    className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#17130E] transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD]"
                  >
                    Open full page canvas
                  </button>
                </div>
              </div>
            </div>

            {previewMode === "compact" ? (
              <DesignLabCompactPreview
                colors={colors}
                shines={shines}
                dimensions={dimensions}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
              />
            ) : (
              <DesignLabFullPagePreview
                colors={colors}
                shines={shines}
                dimensions={dimensions}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
              />
            )}
          </section>

          <section className="rounded-xl border border-[rgba(138,99,36,0.16)] bg-[#FFF9EA] p-3.5">
            <h2 className="text-sm font-bold text-[#17130E]">Shape</h2>
            <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">
              Corner radius for cards and section plates — primary lever for a less
              boxy feel.
            </p>
            <div className="mt-3 space-y-3">
              {DESIGN_LAB_DIMENSION_DEFS.map((def) => (
                <DesignLabDimensionControl
                  key={def.key}
                  dimensionKey={def.key}
                  value={dimensions[def.key]}
                  onChange={(value) => updateDimension(def.key, value)}
                />
              ))}
            </div>
          </section>

          <DesignLabContrastPanel colors={colors} />
          <DesignLabExportPanel colors={colors} shines={shines} />
        </div>
      </div>

      <footer className="rounded-none border border-dashed border-[rgba(138,99,36,0.2)] bg-[#FFF9EA] px-3.5 py-3 text-xs leading-relaxed text-[#6B6255] sm:px-4">
        Drafts live in <span className="font-mono">design_lab_themes</span>. Promote sets
        <span className="font-mono"> is_live</span> for this company; the admin layout
        injects those CSS variables onto{" "}
        <span className="font-mono">.admin-north-star-shell</span>. Revert clears the
        override. Export still emits real CSS variable names from globals.css.
        Optional <span className="font-mono">--token--shine</span> companions store
        gradients beside solid base colors.
      </footer>
    </div>
    </DesignLabSpotlightProvider>
  );
}
