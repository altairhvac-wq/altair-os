import type { ReactNode } from "react";
import { altairSemanticSurfaceClass } from "@/shared/design-system/foundation";

type MissionControlInlineEmptyStateProps = {
  title: string;
  description?: string;
  tone?: "neutral" | "success";
  icon?: ReactNode;
};

export function MissionControlInlineEmptyState({
  title,
  description,
  tone = "neutral",
  icon,
}: MissionControlInlineEmptyStateProps) {
  const toneClass =
    tone === "success"
      ? `border ${altairSemanticSurfaceClass.success}`
      : "border border-altair-border bg-altair-paper-subtle text-altair-ink-on-paper-secondary";

  return (
    <div className={`rounded-xl px-4 py-5 text-center ${toneClass}`}>
      {icon ? (
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-altair-paper shadow-sm ring-1 ring-altair-border">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
      ) : null}
    </div>
  );
}
