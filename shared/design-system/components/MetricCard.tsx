export type MetricCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type MetricCardProps = {
  label: string;
  value: string;
  description?: string;
  trend?: string;
  tone?: MetricCardTone;
  className?: string;
};

const surfaceStyles: Record<MetricCardTone, string> = {
  neutral: "border-slate-200/65 bg-slate-50/75",
  success: "border-emerald-200/55 bg-emerald-50/65",
  warning: "border-amber-200/55 bg-amber-50/65",
  danger: "border-rose-200/55 bg-rose-50/65",
  info: "border-sky-200/55 bg-sky-50/65",
};

const valueStyles: Record<MetricCardTone, string> = {
  neutral: "text-slate-900",
  success: "text-emerald-900",
  warning: "text-amber-900",
  danger: "text-rose-900",
  info: "text-sky-900",
};

const trendStyles: Record<MetricCardTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

export function MetricCard({
  label,
  value,
  description,
  trend,
  tone = "neutral",
  className = "",
}: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5 ${surfaceStyles[tone]} ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem] ${valueStyles[tone]}`}
      >
        {value}
      </p>
      {trend ? (
        <p className={`mt-1.5 text-xs font-medium ${trendStyles[tone]}`}>{trend}</p>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      ) : null}
    </article>
  );
}
