import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type MissionControlMetricTileProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  href: string;
  tone?: "neutral" | "success" | "warning" | "info";
};

const toneClasses = {
  neutral: "border-slate-200/60 bg-[var(--surface-tile)]",
  success: "border-emerald-100/80 bg-emerald-50/30",
  warning: "border-amber-100/80 bg-amber-50/30",
  info: "border-sky-100/80 bg-sky-50/30",
};

const iconToneClasses = {
  neutral: "text-slate-600 bg-slate-50",
  success: "text-emerald-700 bg-emerald-50",
  warning: "text-amber-700 bg-amber-50",
  info: "text-sky-700 bg-sky-50",
};

export function MissionControlMetricTile({
  label,
  value,
  trend,
  icon: Icon,
  href,
  tone = "neutral",
}: MissionControlMetricTileProps) {
  return (
    <Link
      href={href}
      className={`altair-surface-tile admin-metric-card-interactive block ${toneClasses[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
          {label}
        </p>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md lg:h-7 lg:w-7 ${iconToneClasses[tone]}`}
        >
          <Icon className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-1.5 text-xl font-black leading-none tracking-tight tabular-nums text-slate-900 lg:mt-2 lg:text-2xl">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500 lg:text-xs">
        {trend}
      </p>
    </Link>
  );
}
