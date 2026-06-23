"use client";

import {
  contrastRatio,
  formatContrastRatio,
  rateTextContrast,
  ratingLabel,
} from "@/shared/components/platform-admin/design-lab/design-lab-contrast";
import {
  getDashboardSurfaceLabel,
  type DashboardSurfaceId,
  type DashboardSurfaceStyle,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import {
  isValidHexColor,
  normalizeHexColor,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type SurfaceColorControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function SurfaceColorControl({ label, value, onChange }: SurfaceColorControlProps) {
  return (
    <div className="rounded-md border border-[rgba(23,19,14,0.08)] bg-[#FBF7EF] p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#17130E]">{label}</p>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} color picker`}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-[rgba(138,99,36,0.2)] bg-white p-0.5"
        />
      </div>
      <input
        type="text"
        defaultValue={value}
        key={value}
        onBlur={(event) => {
          const normalized = normalizeHexColor(event.target.value);
          if (normalized) {
            onChange(normalized);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const normalized = normalizeHexColor(event.currentTarget.value);
            if (normalized) {
              onChange(normalized);
            }
          }
        }}
        spellCheck={false}
        autoComplete="off"
        className="mt-1.5 w-full rounded border border-[rgba(138,99,36,0.18)] bg-white px-2 py-1 font-mono text-[10px] text-[#17130E] outline-none focus:border-[#B8943F]"
      />
      {!isValidHexColor(value) ? (
        <p className="mt-1 text-[10px] text-[#9A3412]">Use hex like #B8943F.</p>
      ) : null}
    </div>
  );
}

type DesignLabSurfaceInspectorPanelProps = {
  surfaceId: DashboardSurfaceId;
  style: DashboardSurfaceStyle;
  onChange: (field: keyof DashboardSurfaceStyle, value: string) => void;
};

export function DesignLabSurfaceInspectorPanel({
  surfaceId,
  style,
  onChange,
}: DesignLabSurfaceInspectorPanelProps) {
  const ratio = contrastRatio(style.text, style.background);
  const rating = ratio === null ? null : rateTextContrast(ratio);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A6324]">
          Selected surface override
        </p>
        <p className="mt-0.5 text-xs font-semibold text-[#17130E]">
          {getDashboardSurfaceLabel(surfaceId)}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-[#6B6255]">
          Preview-only. Changes this box only in the dashboard replica.
        </p>
      </div>

      <div className="space-y-1.5">
        <SurfaceColorControl
          label="Background"
          value={style.background}
          onChange={(value) => onChange("background", value)}
        />
        <SurfaceColorControl
          label="Text"
          value={style.text}
          onChange={(value) => onChange("text", value)}
        />
        <SurfaceColorControl
          label="Border"
          value={style.border}
          onChange={(value) => onChange("border", value)}
        />
      </div>

      {ratio !== null && rating !== null ? (
        <p className="text-[10px] text-[#6B6255]">
          Surface contrast: {formatContrastRatio(ratio)} · {ratingLabel(rating)}
        </p>
      ) : null}
    </div>
  );
}
