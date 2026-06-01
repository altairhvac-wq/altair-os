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
  accentClassName,
}: ReportsSummaryCardProps) {
  return (
    <div
      className={`admin-metric-card ${accentClassName ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="admin-metric-label">{label}</p>
          <p className="admin-metric-value mt-1 truncate sm:text-2xl">
            {value}
          </p>
          {description ? (
            <p className="admin-text-helper mt-0.5">{description}</p>
          ) : null}
        </div>
        <div className={`admin-metric-icon ${iconClassName}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
