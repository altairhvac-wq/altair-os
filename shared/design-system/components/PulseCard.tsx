import { StatusPill } from "./StatusPill";

export type PulseCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type PulseCardProps = {
  label: string;
  status: string;
  description?: string;
  tone?: PulseCardTone;
  trend?: string;
  meta?: string;
  className?: string;
};

const surfaceStyles: Record<PulseCardTone, string> = {
  neutral: "border-slate-200/65 bg-slate-50/75",
  success: "border-emerald-200/55 bg-emerald-50/65",
  warning: "border-amber-200/55 bg-amber-50/65",
  danger: "border-rose-200/55 bg-rose-50/65",
  info: "border-sky-200/55 bg-sky-50/65",
};

const trendStyles: Record<PulseCardTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

export function PulseCard({
  label,
  status,
  description,
  tone = "neutral",
  trend,
  meta,
  className = "",
}: PulseCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5 ${surfaceStyles[tone]} ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-2">
            <StatusPill tone={tone} size="md">
              {status}
            </StatusPill>
          </div>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>

        {(trend || meta) ? (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
            {trend ? (
              <p className={`text-xs font-medium ${trendStyles[tone]}`}>{trend}</p>
            ) : null}
            {meta ? (
              <p className="text-xs font-medium text-slate-500">{meta}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
