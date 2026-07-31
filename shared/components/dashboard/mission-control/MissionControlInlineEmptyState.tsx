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
    <div
      className={`flex min-w-0 items-start gap-3 rounded-xl px-3.5 py-3 text-left sm:px-4 ${toneClass}`}
    >
      {icon ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-altair-paper shadow-sm ring-1 ring-altair-border">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed opacity-80">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
