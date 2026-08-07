"use client";

import {
  designLabColorPickerValue,
  getDesignLabOpacityPercent,
  isValidDesignLabColor,
  normalizeDesignLabColor,
  parseDesignLabColorChannels,
  withDesignLabOpacity,
  withDesignLabRgb,
  type DesignLabColorKey,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { useDesignLabTokenSpotlightHandlers } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import {
  defaultShineFromColor,
  formatDesignLabShineGradient,
  getDesignLabTokenPaintRole,
  type DesignLabShine,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

type DesignLabColorControlProps = {
  label: string;
  helper?: string;
  cssVar?: string;
  /** Token key — enables replica spotlight when focused/edited. */
  tokenKey?: DesignLabColorKey;
  value: string;
  onChange: (value: string) => void;
  shine?: DesignLabShine | null;
  onShineChange?: (shine: DesignLabShine | null) => void;
  compact?: boolean;
  showCssVar?: boolean;
};

const CHECKER_BG =
  "linear-gradient(45deg, #c4bfb4 25%, transparent 25%), linear-gradient(-45deg, #c4bfb4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c4bfb4 75%), linear-gradient(-45deg, transparent 75%, #c4bfb4 75%)";

/**
 * Shared hex picker + opacity slider (+ optional shine) for every Design Lab
 * color token. Fully opaque values stay hex; reduced opacity stores modern
 * `rgb(r g b / a%)`.
 */
export function DesignLabColorControl({
  label,
  helper,
  cssVar,
  tokenKey,
  value,
  onChange,
  shine = null,
  onShineChange,
  compact = false,
  showCssVar = true,
}: DesignLabColorControlProps) {
  const channels = parseDesignLabColorChannels(value);
  const pickerEnabled = channels !== null;
  const opacityPercent = getDesignLabOpacityPercent(value);
  const inputId = `design-lab-color-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const opacityId = `${inputId}-opacity`;
  const shineEnabled = Boolean(shine);
  const paintRole = tokenKey
    ? getDesignLabTokenPaintRole(tokenKey)
    : ("fill" as const);
  const spotlight = useDesignLabTokenSpotlightHandlers(tokenKey);

  function commitText(next: string) {
    const normalized = normalizeDesignLabColor(next);
    if (normalized) {
      onChange(normalized);
      spotlight.onEdit();
    }
  }

  function commitRgb(nextHex: string) {
    const next = withDesignLabRgb(value, nextHex) ?? nextHex.toUpperCase();
    onChange(next);
    spotlight.onEdit();
  }

  function commitOpacity(nextPercent: number) {
    const next = withDesignLabOpacity(value, nextPercent);
    if (!next) {
      return;
    }
    onChange(next);
    spotlight.onEdit();
  }

  function toggleShine(enabled: boolean) {
    if (!onShineChange) {
      return;
    }
    if (enabled) {
      onShineChange(shine ?? defaultShineFromColor(value));
    } else {
      onShineChange(null);
    }
    spotlight.onEdit();
  }

  function updateShine(patch: Partial<DesignLabShine>) {
    if (!onShineChange) {
      return;
    }
    const base = shine ?? defaultShineFromColor(value);
    onShineChange({ ...base, ...patch });
    spotlight.onEdit();
  }

  /* Color/gradient layered ABOVE checker so alpha reads clearly. */
  const swatchStyle: React.CSSProperties =
    shineEnabled && shine
      ? {
          backgroundImage: `${formatDesignLabShineGradient(shine)}, ${CHECKER_BG}`,
          backgroundSize: "100% 100%, 10px 10px",
        }
      : {
          backgroundImage: `linear-gradient(${value}, ${value}), ${CHECKER_BG}`,
          backgroundSize: "100% 100%, 10px 10px",
        };

  return (
    <div
      data-design-lab-color-control={tokenKey}
      onFocusCapture={spotlight.onFocus}
      onBlurCapture={spotlight.onBlur}
      className={
        compact
          ? "rounded-md border border-[rgba(23,19,14,0.08)] bg-[#FBF7EF] p-2.5"
          : "rounded-lg border border-[rgba(138,99,36,0.14)] bg-white p-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#17130E]">{label}</p>
          {showCssVar && cssVar ? (
            <p className="mt-0.5 font-mono text-[10px] text-[#8A6324]">{cssVar}</p>
          ) : null}
          {helper ? (
            <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">{helper}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="h-9 w-9 rounded-lg border border-[rgba(138,99,36,0.2)]"
            style={swatchStyle}
            title={`Preview · ${opacityPercent}% opacity${shineEnabled ? " · shine" : ""}`}
            aria-hidden
          />
          {pickerEnabled ? (
            <input
              type="color"
              value={designLabColorPickerValue(value)}
              onChange={(event) => commitRgb(event.target.value)}
              aria-label={`${label} color picker`}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[rgba(138,99,36,0.2)] bg-white p-0.5"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-2.5">
        <label className="sr-only" htmlFor={inputId}>
          {label} color value
        </label>
        <input
          id={inputId}
          key={value}
          type="text"
          defaultValue={value}
          onBlur={(event) => commitText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText(event.currentTarget.value);
            }
          }}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] px-2.5 py-1.5 font-mono text-xs text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-2 focus:ring-[#B8943F]/20"
        />
        {!isValidDesignLabColor(value) ? (
          <p className="mt-1 text-[11px] text-[#9A3412]">
            Use a hex (#B8943F) or rgb() value from globals.css.
          </p>
        ) : null}
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={opacityId}
            className="text-[11px] font-semibold text-[#6B6255]"
          >
            Opacity
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={opacityPercent}
              disabled={!pickerEnabled}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(next)) {
                  commitOpacity(Math.min(100, Math.max(0, next)));
                }
              }}
              aria-label={`${label} opacity percent`}
              className="w-14 rounded border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] px-1.5 py-0.5 text-right font-mono text-[11px] text-[#17130E] outline-none focus:border-[#B8943F] disabled:opacity-50"
            />
            <span className="text-[11px] text-[#6B6255]">%</span>
          </div>
        </div>
        <div className="relative mt-1.5 h-3.5 w-full overflow-hidden rounded-full border border-[rgba(138,99,36,0.22)]">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#ebe6dc",
              backgroundImage: CHECKER_BG,
              backgroundSize: "8px 8px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 transition-[width]"
            style={{
              width: `${opacityPercent}%`,
              backgroundImage: `linear-gradient(${value}, ${value})`,
            }}
            aria-hidden
          />
          <input
            id={opacityId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacityPercent}
            disabled={!pickerEnabled}
            onChange={(event) =>
              commitOpacity(Number.parseInt(event.target.value, 10))
            }
            aria-label={`${label} opacity`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {onShineChange ? (
        <div className="mt-3 border-t border-[rgba(138,99,36,0.12)] pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[#6B6255]">
                Shine / gradient
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-[#8A8275]">
                {paintRole === "fill"
                  ? "Applies as background-image over the solid base."
                  : paintRole === "stroke"
                    ? "Applies via border-image (sharp edges; radius suppressed)."
                    : "Applies via background-clip:text — keep stop contrast high."}
              </p>
            </div>
            <div
              className="flex rounded-md border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] p-0.5"
              role="group"
              aria-label={`${label} fill mode`}
            >
              <button
                type="button"
                aria-pressed={!shineEnabled}
                onClick={() => toggleShine(false)}
                className={[
                  "rounded px-2 py-1 text-[10px] font-semibold transition-colors",
                  !shineEnabled
                    ? "bg-[#FFF3D6] text-[#17130E] shadow-[inset_0_0_0_1px_rgba(184,148,63,0.25)]"
                    : "text-[#6B6255] hover:text-[#17130E]",
                ].join(" ")}
              >
                Flat
              </button>
              <button
                type="button"
                aria-pressed={shineEnabled}
                onClick={() => toggleShine(true)}
                className={[
                  "rounded px-2 py-1 text-[10px] font-semibold transition-colors",
                  shineEnabled
                    ? "bg-[#FFF3D6] text-[#17130E] shadow-[inset_0_0_0_1px_rgba(184,148,63,0.25)]"
                    : "text-[#6B6255] hover:text-[#17130E]",
                ].join(" ")}
              >
                Shine
              </button>
            </div>
          </div>

          {shineEnabled && shine ? (
            <div className="mt-2 space-y-2">
              <div
                className="h-8 overflow-hidden rounded-md border border-[rgba(138,99,36,0.18)]"
                style={{
                  backgroundImage: formatDesignLabShineGradient(shine),
                }}
                aria-hidden
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold text-[#6B6255]">
                    From
                  </span>
                  <input
                    type="color"
                    value={designLabColorPickerValue(shine.from)}
                    onChange={(event) =>
                      updateShine({
                        from:
                          withDesignLabRgb(shine.from, event.target.value) ??
                          event.target.value.toUpperCase(),
                      })
                    }
                    aria-label={`${label} shine from`}
                    className="h-8 w-full cursor-pointer rounded border border-[rgba(138,99,36,0.18)] bg-white p-0.5"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold text-[#6B6255]">
                    To
                  </span>
                  <input
                    type="color"
                    value={designLabColorPickerValue(shine.to)}
                    onChange={(event) =>
                      updateShine({
                        to:
                          withDesignLabRgb(shine.to, event.target.value) ??
                          event.target.value.toUpperCase(),
                      })
                    }
                    aria-label={`${label} shine to`}
                    className="h-8 w-full cursor-pointer rounded border border-[rgba(138,99,36,0.18)] bg-white p-0.5"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#6B6255]">
                    Angle
                  </span>
                  <span className="font-mono text-[10px] text-[#6B6255]">
                    {shine.angle}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={shine.angle}
                  onChange={(event) =>
                    updateShine({
                      angle: Number.parseInt(event.target.value, 10),
                    })
                  }
                  aria-label={`${label} shine angle`}
                  className="w-full accent-[#B8943F]"
                />
              </label>
              {paintRole === "ink" ? (
                <p className="text-[10px] leading-snug text-[#9A3412]">
                  Text gradients can hurt readability if either stop is weak on
                  its background. Prefer high-contrast stops; solid color remains
                  the forced-colors fallback.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-1.5 font-mono text-[11px] text-[#6B6255]">
        Current: {value}
        {shineEnabled && shine
          ? ` · ${formatDesignLabShineGradient(shine)}`
          : ""}
      </p>
    </div>
  );
}
