import Link from "next/link";

export type InsightCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type InsightCardAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type InsightCardProps = {
  title: string;
  insight: string;
  recommendation?: string;
  tone?: InsightCardTone;
  eyebrow?: string;
  action?: InsightCardAction;
  className?: string;
};

const surfaceStyles: Record<InsightCardTone, string> = {
  neutral: "border-slate-200/60 bg-slate-50/70",
  success: "border-emerald-200/50 bg-emerald-50/60",
  warning: "border-amber-200/50 bg-amber-50/60",
  danger: "border-rose-200/50 bg-rose-50/60",
  info: "border-sky-200/50 bg-sky-50/60",
};

const eyebrowStyles: Record<InsightCardTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

const recommendationStyles: Record<InsightCardTone, string> = {
  neutral: "border-slate-200/55 bg-white/80",
  success: "border-emerald-200/45 bg-white/75",
  warning: "border-amber-200/45 bg-white/75",
  danger: "border-rose-200/45 bg-white/75",
  info: "border-sky-200/45 bg-white/75",
};

type InsightActionButtonProps = {
  action: InsightCardAction;
};

function InsightActionButton({ action }: InsightActionButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center rounded-xl border border-slate-200/85 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-auto";

  if (action.href) {
    return (
      <Link href={action.href} className={baseStyles}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={baseStyles}>
      {action.label}
    </button>
  );
}

export function InsightCard({
  title,
  insight,
  recommendation,
  tone = "neutral",
  eyebrow,
  action,
  className = "",
}: InsightCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-[var(--shadow-card)] sm:p-5 ${surfaceStyles[tone]} ${className}`}
    >
      <div
        className={`flex flex-col gap-4 ${action ? "sm:flex-row sm:items-start sm:justify-between" : ""}`}
      >
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p
              className={`mb-2 text-[11px] font-bold uppercase tracking-[0.14em] ${eyebrowStyles[tone]}`}
            >
              {eyebrow}
            </p>
          ) : null}
          <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{insight}</p>

          {recommendation ? (
            <div
              className={`mt-3 rounded-xl border px-3.5 py-3 ${recommendationStyles[tone]}`}
              role="note"
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${eyebrowStyles[tone]}`}
              >
                Recommendation
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{recommendation}</p>
            </div>
          ) : null}
        </div>

        {action ? (
          <div className="w-full shrink-0 sm:w-auto">
            <InsightActionButton action={action} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
