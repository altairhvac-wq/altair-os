"use client";

import { useState } from "react";
import {
  DESIGN_LAB_COLOR_FIELDS,
  NORTH_STAR_DESIGN_LAB_DEFAULTS,
  isValidHexColor,
  normalizeHexColor,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { DesignLabContrastPanel } from "@/shared/components/platform-admin/design-lab/DesignLabContrastPanel";
import { DesignLabExportPanel } from "@/shared/components/platform-admin/design-lab/DesignLabExportPanel";
import { DESIGN_LAB_PRESETS } from "@/shared/components/platform-admin/design-lab/design-lab-presets";

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

function previewVars(colors: DesignLabColors): React.CSSProperties {
  return {
    "--dl-page-bg": colors.pageBackground,
    "--dl-card-bg": colors.cardBackground,
    "--dl-card-border": colors.cardBorder,
    "--dl-primary-bg": colors.primaryButton,
    "--dl-primary-text": colors.primaryButtonText,
    "--dl-secondary-bg": colors.secondaryButton,
    "--dl-secondary-text": colors.secondaryButtonText,
    "--dl-heading-text": colors.headerText,
    "--dl-body-text": colors.bodyText,
    "--dl-muted-text": colors.mutedText,
    "--dl-success-bg": colors.successBadge,
    "--dl-warning-bg": colors.warningBadge,
    "--dl-danger-bg": colors.dangerBadge,
  } as React.CSSProperties;
}

export function DesignLabPageView() {
  const [colors, setColors] = useState<DesignLabColors>(
    NORTH_STAR_DESIGN_LAB_DEFAULTS,
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    "north-star-default",
  );
  const [resetKey, setResetKey] = useState(0);

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
              <h2 className="text-sm font-semibold text-[#17130E]">Live preview</h2>
              <p className="text-xs text-[#6B6255]">
                Scoped styles — customer pages are unchanged.
              </p>
            </div>

            <div
              className="design-lab-preview p-4 sm:p-5"
              style={previewVars(colors)}
            >
              <div
                className="rounded-[1rem] p-4 sm:p-5"
                style={{ backgroundColor: "var(--dl-page-bg)" }}
              >
                <div className="space-y-1">
                  <h3
                    className="text-lg font-bold"
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    Service dashboard
                  </h3>
                  <p className="text-sm" style={{ color: "var(--dl-muted-text)" }}>
                    Preview shell for headings, cards, and actions.
                  </p>
                </div>

                <div
                  className="mt-4 rounded-[0.875rem] border p-4"
                  style={{
                    backgroundColor: "var(--dl-card-bg)",
                    borderColor: "var(--dl-card-border)",
                  }}
                >
                  <h4
                    className="text-base font-semibold"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    Today&apos;s jobs
                  </h4>
                  <p className="mt-1 text-sm" style={{ color: "var(--dl-body-text)" }}>
                    Body text shows how readable copy feels on card surfaces.
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--dl-muted-text)" }}>
                    Muted text for timestamps, metadata, and helper lines.
                  </p>

                  <div
                    className="mt-3 rounded-lg border p-3"
                    style={{
                      backgroundColor: "var(--dl-card-bg)",
                      borderColor: "var(--dl-card-border)",
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--dl-body-text)" }}>
                      Nested section
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--dl-muted-text)" }}>
                      A smaller card inside the main surface.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--dl-primary-bg)",
                        color: "var(--dl-primary-text)",
                      }}
                    >
                      Primary action
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--dl-secondary-bg)",
                        color: "var(--dl-secondary-text)",
                      }}
                    >
                      Secondary action
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--dl-success-bg)",
                        color: "var(--dl-body-text)",
                      }}
                    >
                      Success
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--dl-warning-bg)",
                        color: "var(--dl-body-text)",
                      }}
                    >
                      Warning
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--dl-danger-bg)",
                        color: "var(--dl-body-text)",
                      }}
                    >
                      Danger
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
                  Preview CSS variables are scoped to this panel only.
                </p>
              </div>
            </div>
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
