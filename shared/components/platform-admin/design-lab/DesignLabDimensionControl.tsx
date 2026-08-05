"use client";

import {
  formatRemValue,
  getDesignLabDimensionDef,
  parseRemValue,
  type DesignLabDimensionKey,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";

type DesignLabDimensionControlProps = {
  dimensionKey: DesignLabDimensionKey;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

export function DesignLabDimensionControl({
  dimensionKey,
  value,
  onChange,
  compact = false,
}: DesignLabDimensionControlProps) {
  const def = getDesignLabDimensionDef(dimensionKey);
  if (!def) {
    return null;
  }

  const rem = parseRemValue(value) ?? parseRemValue(def.defaultValue) ?? 0;
  const percentLabel =
    rem === 0 ? "0 (sharp)" : `${Math.round(rem * 16)}px · ${formatRemValue(rem)}`;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={`design-lab-dim-${dimensionKey}`}
          className="text-xs font-semibold text-[#17130E]"
        >
          {def.label}
        </label>
        <span className="font-mono text-[10px] text-[#6B6255]">{def.cssVar}</span>
      </div>
      {!compact ? (
        <p className="text-[11px] leading-snug text-[#6B6255]">{def.helper}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          id={`design-lab-dim-${dimensionKey}`}
          type="range"
          min={def.minRem}
          max={def.maxRem}
          step={def.stepRem}
          value={rem}
          onChange={(event) =>
            onChange(formatRemValue(Number.parseFloat(event.target.value)))
          }
          className="h-1.5 w-full accent-[#B8943F]"
        />
        <span className="w-[5.5rem] shrink-0 text-right font-mono text-[10px] tabular-nums text-[#4F4638]">
          {percentLabel}
        </span>
      </div>
    </div>
  );
}
