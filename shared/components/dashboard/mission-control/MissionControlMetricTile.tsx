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
  neutral: "border-slate-100 bg-white",
  success: "border-emerald-100 bg-emerald-50/40",
  warning: "border-amber-100 bg-amber-50/40",
  info: "border-sky-100 bg-sky-50/40",
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
      className={`admin-metric-card admin-metric-card-interactive block ${toneClasses[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
            {label}
          </p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900 lg:mt-2 lg:text-2xl">
            {value}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 lg:mt-1 lg:text-xs">
            {trend}
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${iconToneClasses[tone]}`}
        >
          <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
