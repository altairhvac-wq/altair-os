import {
  getDesignLabColorFieldMeta,
  getDesignLabEditTarget,
  type DesignLabEditTargetId,
} from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  isValidHexColor,
  normalizeHexColor,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type TargetColorControlProps = {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

function TargetColorControl({
  label,
  helper,
  value,
  onChange,
  compact = false,
}: TargetColorControlProps) {
  return (
    <div
      className={
        compact
          ? "rounded-md border border-[rgba(23,19,14,0.08)] bg-[#FBF7EF] p-2.5"
          : "rounded-lg border border-[rgba(138,99,36,0.14)] bg-white p-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#17130E]">{label}</p>
          <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">{helper}</p>
        </div>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} color picker`}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[rgba(138,99,36,0.2)] bg-white p-0.5"
        />
      </div>
      <TargetHexInput label={label} value={value} onChange={onChange} />
      <p className="mt-1.5 font-mono text-[11px] text-[#6B6255]">Current: {value}</p>
    </div>
  );
}

function TargetHexInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = `target-hex-${label.replace(/\s+/g, "-").toLowerCase()}`;

  function commitHex(next: string) {
    const normalized = normalizeHexColor(next);
    if (normalized) {
      onChange(normalized);
    }
  }

  return (
    <div className="mt-2.5">
      <label className="sr-only" htmlFor={inputId}>
        {label} hex value
      </label>
      <input
        id={inputId}
        key={value}
        type="text"
        defaultValue={value}
        onBlur={(event) => commitHex(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitHex(event.currentTarget.value);
          }
        }}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] px-2.5 py-1.5 font-mono text-xs text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-2 focus:ring-[#B8943F]/20"
      />
      {!isValidHexColor(value) ? (
        <p className="mt-1 text-[11px] text-[#9A3412]">Use a hex value like #B8943F.</p>
      ) : null}
    </div>
  );
}

type DesignLabEditTargetPanelProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  colors: DesignLabColors;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
  emptyStateText?: string;
  variant?: "default" | "compact";
};

export function DesignLabEditTargetPanel({
  selectedTargetId,
  colors,
  onColorChange,
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
                <TargetColorControl
                  key={fieldKey}
                  label={meta.label}
                  helper={meta.helper}
                  value={colors[fieldKey]}
                  onChange={(value) => onColorChange(fieldKey, value)}
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
