import {
  getDesignLabColorFieldMeta,
  getDesignLabEditTarget,
  type DesignLabEditTargetId,
} from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { DesignLabColorControl } from "@/shared/components/platform-admin/design-lab/DesignLabColorControl";
import type {
  DesignLabShine,
  DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

type DesignLabEditTargetPanelProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
  onShineChange?: (
    key: keyof DesignLabColors,
    shine: DesignLabShine | null,
  ) => void;
  emptyStateText?: string;
  variant?: "default" | "compact";
};

export function DesignLabEditTargetPanel({
  selectedTargetId,
  colors,
  shines = {},
  onColorChange,
  onShineChange,
  emptyStateText = "Click something in the preview to edit its color.",
  variant = "default",
}: DesignLabEditTargetPanelProps) {
  const target = selectedTargetId
    ? getDesignLabEditTarget(selectedTargetId)
    : undefined;

  const isCompact = variant === "compact";

  return (
    <section
      className={
        isCompact
          ? ""
          : "rounded-xl border border-[rgba(138,99,36,0.16)] bg-[#FFF9EA] p-3.5"
      }
    >
      {!isCompact ? (
        <h2 className="text-sm font-bold text-[#17130E]">Editing target</h2>
      ) : null}

      {!target ? (
        <p
          className={[
            "text-xs leading-snug text-[#6B6255]",
            isCompact ? "" : "mt-2",
          ].join(" ")}
        >
          {emptyStateText}
        </p>
      ) : (
        <div className={isCompact ? "space-y-2.5" : "mt-2 space-y-3"}>
          <div>
            <p className="text-sm font-semibold text-[#17130E]">
              {isCompact ? target.label : `Editing: ${target.label}`}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">{target.helper}</p>
          </div>

          <div className="space-y-2">
            {target.fields.map((fieldKey) => {
              const meta = getDesignLabColorFieldMeta(fieldKey);
              if (!meta) {
                return null;
              }

              return (
                <DesignLabColorControl
                  key={fieldKey}
                  tokenKey={fieldKey}
                  label={meta.label}
                  helper={meta.helper}
                  cssVar={meta.cssVar}
                  value={colors[fieldKey]}
                  onChange={(value) => onColorChange(fieldKey, value)}
                  shine={shines[fieldKey] ?? null}
                  onShineChange={
                    onShineChange
                      ? (shine) => onShineChange(fieldKey, shine)
                      : undefined
                  }
                  compact={isCompact}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
