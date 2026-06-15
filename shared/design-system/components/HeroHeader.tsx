import Link from "next/link";

export type HeroTone = "neutral" | "success" | "warning" | "danger" | "info";

export type HeroAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type HeroHighlight = {
  label: string;
  value: string;
  tone?: HeroTone;
};

export type HeroInsight = {
  label?: string;
  text: string;
  tone?: HeroTone;
};

export type HeroHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  highlights?: HeroHighlight[];
  insight?: HeroInsight;
  className?: string;
};

const highlightSurfaceStyles: Record<HeroTone, string> = {
  neutral: "border-slate-200/65 bg-slate-50/75",
  success: "border-emerald-200/55 bg-emerald-50/65",
  warning: "border-amber-200/55 bg-amber-50/65",
  danger: "border-rose-200/55 bg-rose-50/65",
  info: "border-sky-200/55 bg-sky-50/65",
};

const highlightValueStyles: Record<HeroTone, string> = {
  neutral: "text-slate-900",
  success: "text-emerald-900",
  warning: "text-amber-900",
  danger: "text-rose-900",
  info: "text-sky-900",
};

const insightSurfaceStyles: Record<HeroTone, string> = {
  neutral: "border-slate-200/60 bg-slate-50/70",
  success: "border-emerald-200/50 bg-emerald-50/60",
  warning: "border-amber-200/50 bg-amber-50/60",
  danger: "border-rose-200/50 bg-rose-50/60",
  info: "border-sky-200/50 bg-sky-50/60",
};

const insightLabelStyles: Record<HeroTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

type HeroActionButtonProps = {
  action: HeroAction;
  variant: "primary" | "secondary";
};

function HeroActionButton({ action, variant }: HeroActionButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto";
  const variantStyles =
    variant === "primary"
      ? "bg-cyan-600 text-white shadow-sm hover:bg-cyan-700"
      : "border border-slate-200/85 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50";

  if (action.href) {
    return (
      <Link href={action.href} className={`${baseStyles} ${variantStyles}`}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`${baseStyles} ${variantStyles}`}
    >
      {action.label}
    </button>
  );
}

export function HeroHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  highlights,
  insight,
  className = "",
}: HeroHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryAction);
  const hasHighlights = Boolean(highlights && highlights.length > 0);

  return (
    <header
      className={`rounded-2xl border border-slate-200/60 bg-white/95 p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        <div
          className={`flex flex-col gap-4 ${hasActions ? "sm:flex-row sm:items-start sm:justify-between" : ""}`}
        >
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            ) : null}
          </div>

          {hasActions ? (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {secondaryAction ? (
                <HeroActionButton action={secondaryAction} variant="secondary" />
              ) : null}
              {primaryAction ? (
                <HeroActionButton action={primaryAction} variant="primary" />
              ) : null}
            </div>
          ) : null}
        </div>

        {hasHighlights ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {highlights!.map((highlight) => {
              const tone = highlight.tone ?? "neutral";

              return (
                <div
                  key={`${highlight.label}-${highlight.value}`}
                  className={`rounded-xl border px-4 py-3 ${highlightSurfaceStyles[tone]}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {highlight.label}
                  </p>
                  <p
                    className={`mt-1 text-base font-bold tracking-tight sm:text-lg ${highlightValueStyles[tone]}`}
                  >
                    {highlight.value}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        {insight ? (
          <HeroInsightCallout insight={insight} />
        ) : null}
      </div>
    </header>
  );
}

function HeroInsightCallout({ insight }: { insight: HeroInsight }) {
  const tone = insight.tone ?? "neutral";

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${insightSurfaceStyles[tone]}`}
      role="note"
    >
      {insight.label ? (
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${insightLabelStyles[tone]}`}
        >
          {insight.label}
        </p>
      ) : null}
      <p className={`text-sm leading-relaxed text-slate-700 ${insight.label ? "mt-1" : ""}`}>
        {insight.text}
      </p>
    </div>
  );
}
