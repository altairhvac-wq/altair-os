"use client";

import { useState } from "react";
import {
  DESIGN_LAB_COLOR_FIELDS,
  NORTH_STAR_DESIGN_LAB_DEFAULTS,
  isValidHexColor,
  normalizeHexColor,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { DesignLabCompactPreview } from "@/shared/components/platform-admin/design-lab/DesignLabCompactPreview";
import { DesignLabContrastPanel } from "@/shared/components/platform-admin/design-lab/DesignLabContrastPanel";
import { DesignLabEditTargetPanel } from "@/shared/components/platform-admin/design-lab/DesignLabEditTargetPanel";
import { DesignLabExportPanel } from "@/shared/components/platform-admin/design-lab/DesignLabExportPanel";
import { DesignLabFullPageCanvas } from "@/shared/components/platform-admin/design-lab/DesignLabFullPageCanvas";
import { DesignLabFullPagePreview } from "@/shared/components/platform-admin/design-lab/DesignLabFullPagePreview";
import {
  getDesignLabEditTarget,
  type DesignLabEditTargetId,
} from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import { DESIGN_LAB_PRESETS } from "@/shared/components/platform-admin/design-lab/design-lab-presets";

type PreviewMode = "compact" | "full";

type ColorControlProps = {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorControl({ label, helper, value, onChange }: ColorControlProps) {
  const [hexDraft, setHexDraft] = useState(value);

  function commitHex(next: string) {
    const normalized = normalizeHexColor(next);

    if (normalized) {
      onChange(normalized);
      setHexDraft(normalized);
      return;
    }

    setHexDraft(value);
  }

  return (
    <div className="rounded-xl border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="block text-sm font-semibold text-[#17130E]">
            {label}
          </label>
          <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">{helper}</p>
        </div>
        <input
          type="color"
          value={value}
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            onChange(next);
            setHexDraft(next);
          }}
          aria-label={`${label} color picker`}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[rgba(138,99,36,0.2)] bg-white p-0.5"
        />
      </div>
      <div className="mt-2.5">
        <label className="sr-only" htmlFor={`hex-${label}`}>
          {label} hex value
        </label>
        <input
          id={`hex-${label}`}
          type="text"
          value={hexDraft}
          onChange={(event) => setHexDraft(event.target.value)}
          onBlur={() => commitHex(hexDraft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitHex(hexDraft);
            }
          }}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-white px-2.5 py-1.5 font-mono text-xs text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-2 focus:ring-[#B8943F]/20"
        />
        {!isValidHexColor(hexDraft) ? (
          <p className="mt-1 text-[11px] text-[#9A3412]">Use a hex value like #B8943F.</p>
        ) : null}
      </div>
    </div>
  );
}

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
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onExitCanvas: () => void;
};

function DesignLabCanvasMode({
  colors,
  selectedTargetId,
  onSelectTarget,
  onColorChange,
  previewMode,
  onPreviewModeChange,
  onExitCanvas,
}: DesignLabCanvasModeProps) {
  const selectedTarget = selectedTargetId
    ? getDesignLabEditTarget(selectedTargetId)
    : undefined;

  function handlePreviewModeChange(mode: PreviewMode) {
    onPreviewModeChange(mode);
    onExitCanvas();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F0E4]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[rgba(138,99,36,0.16)] bg-[#FBF7EF] px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExitCanvas}
            className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#17130E] transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD]"
          >
            Back to controls
          </button>
          <PreviewModeToggle
            previewMode={previewMode}
            onPreviewModeChange={handlePreviewModeChange}
          />
          <span className="rounded-md bg-[#FFF3D6] px-2.5 py-1 text-[11px] font-semibold text-[#8A6324]">
            Full page canvas
          </span>
        </div>
        <p className="text-xs text-[#6B6255]">
          {selectedTarget
            ? `Editing: ${selectedTarget.label}`
            : "Click a preview element to select an edit target"}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <DesignLabFullPageCanvas
          colors={colors}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />

        <aside
          aria-label="Canvas color editor"
          className="pointer-events-none fixed bottom-4 right-4 top-[calc(3.5rem+1rem)] z-[60] hidden w-[min(20rem,calc(100%-2rem))] sm:block"
        >
          <div className="pointer-events-auto h-full overflow-y-auto rounded-xl border border-[rgba(138,99,36,0.2)] bg-[#FBF7EF] p-3 shadow-[0_12px_32px_rgba(23,19,14,0.18)]">
            <DesignLabEditTargetPanel
              selectedTargetId={selectedTargetId}
              colors={colors}
              onColorChange={onColorChange}
              emptyStateText="Click something in the canvas to edit its color."
            />
          </div>
        </aside>

        <aside
          aria-label="Canvas color editor"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] max-h-[45vh] sm:hidden"
        >
          <div className="pointer-events-auto overflow-y-auto rounded-t-xl border border-[rgba(138,99,36,0.2)] bg-[#FBF7EF] p-3 shadow-[0_-8px_24px_rgba(23,19,14,0.14)]">
            <DesignLabEditTargetPanel
              selectedTargetId={selectedTargetId}
              colors={colors}
              onColorChange={onColorChange}
              emptyStateText="Click something in the canvas to edit its color."
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function DesignLabPageView() {
  const [colors, setColors] = useState<DesignLabColors>(
    NORTH_STAR_DESIGN_LAB_DEFAULTS,
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    "north-star-default",
  );
  const [resetKey, setResetKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("compact");
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const [selectedTargetId, setSelectedTargetId] =
    useState<DesignLabEditTargetId | null>(null);

  function applyPreset(presetId: string) {
    const preset = DESIGN_LAB_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    setColors({ ...preset.colors });
    setActivePresetId(presetId);
    setResetKey((current) => current + 1);
  }

  function updateColor(key: keyof DesignLabColors, value: string) {
    setColors((current) => ({ ...current, [key]: value }));
    setActivePresetId(null);
  }

  function resetToDefaults() {
    setColors(NORTH_STAR_DESIGN_LAB_DEFAULTS);
    setActivePresetId("north-star-default");
    setResetKey((current) => current + 1);
  }

  if (isCanvasMode) {
    return (
      <DesignLabCanvasMode
        colors={colors}
        selectedTargetId={selectedTargetId}
        onSelectTarget={setSelectedTargetId}
        onColorChange={updateColor}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        onExitCanvas={() => setIsCanvasMode(false)}
      />
    );
  }

  return (
    <div className="platform-north-star-workspace min-w-0 space-y-4 px-3 pb-16 sm:px-3.5 sm:pb-20 lg:px-5 lg:pb-24">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]">
          Internal
        </p>
        <h1 className="text-2xl font-bold text-[#17130E] sm:text-3xl">Design Lab</h1>
        <p className="max-w-2xl text-sm text-[#6B6255]">
          Founder-only visual controls for Altair.
        </p>
      </header>

      <section className="rounded-[1rem] border border-[rgba(138,99,36,0.16)] bg-[#FBF7EF] px-3.5 py-3 sm:px-4">
        <h2 className="text-sm font-semibold text-[#17130E]">Preview-only phase</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#4F4638]">
          DL-1 is a safe sandbox. Changes here stay in this page and do not affect
          customer-facing screens, shared tokens, or global CSS.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-3">
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
                          style={{ backgroundColor: preset.colors.pageBackground }}
                          aria-hidden
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-[rgba(23,19,14,0.12)]"
                          style={{ backgroundColor: preset.colors.cardBackground }}
                          aria-hidden
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-[rgba(23,19,14,0.12)]"
                          style={{ backgroundColor: preset.colors.primaryButton }}
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
            onColorChange={updateColor}
          />

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#17130E]">Color controls</h2>
            <button
              type="button"
              onClick={resetToDefaults}
              className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#6B6255] transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] hover:text-[#17130E]"
            >
              Reset to North Star defaults
            </button>
          </div>
          <p className="text-xs leading-snug text-[#6B6255]">
            Adjust values to explore palettes. Only the preview panel on the right
            updates.
          </p>
          <div key={resetKey} className="space-y-2.5">
            {DESIGN_LAB_COLOR_FIELDS.map(({ key, label, helper }) => (
              <ColorControl
                key={key}
                label={label}
                helper={helper}
                value={colors[key]}
                onChange={(value) => updateColor(key, value)}
              />
            ))}
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
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
              />
            ) : (
              <DesignLabFullPagePreview
                colors={colors}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
              />
            )}
          </section>

          <DesignLabContrastPanel colors={colors} />
          <DesignLabExportPanel colors={colors} />
        </div>
      </div>

      <footer className="rounded-[1rem] border border-dashed border-[rgba(138,99,36,0.2)] bg-[#FFF9EA] px-3.5 py-3 text-xs leading-relaxed text-[#6B6255] sm:px-4">
        Future phases can promote approved values from this lab into shared North
        Star tokens. DL-1 does not save, publish, or apply themes globally.
      </footer>
    </div>
  );
}
