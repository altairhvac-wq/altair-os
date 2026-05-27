import type { LucideIcon } from "lucide-react";

type ReportsSummaryCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
  accentClassName?: string;
};

export function ReportsSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  accentClassName = "border-slate-200",
}: ReportsSummaryCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accentClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
            {value}
          </p>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
