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
import { DesignLabColorControl } from "@/shared/components/platform-admin/design-lab/DesignLabColorControl";

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
        <DesignLabColorControl
          label="Background"
          value={style.background}
          onChange={(value) => onChange("background", value)}
          compact
          showCssVar={false}
        />
        <DesignLabColorControl
          label="Text"
          value={style.text}
          onChange={(value) => onChange("text", value)}
          compact
          showCssVar={false}
        />
        <DesignLabColorControl
          label="Border"
          value={style.border}
          onChange={(value) => onChange("border", value)}
          compact
          showCssVar={false}
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
