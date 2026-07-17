import type { ReactNode } from "react";

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
      ? "border-emerald-100 bg-emerald-50/50 text-emerald-900"
      : "border-slate-100 bg-slate-50/70 text-slate-700";

  return (
    <div className={`rounded-xl border px-4 py-5 text-center ${toneClass}`}>
      {icon ? (
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5">
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
