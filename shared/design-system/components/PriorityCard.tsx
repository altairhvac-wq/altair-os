import Link from "next/link";

export type PriorityCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type PriorityCardAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type PriorityCardProps = {
  title: string;
  description?: string;
  tone?: PriorityCardTone;
  eyebrow?: string;
  action?: PriorityCardAction;
  meta?: string;
  className?: string;
};

const accentStyles: Record<PriorityCardTone, string> = {
  neutral: "border-l-slate-300/80",
  success: "border-l-emerald-400/70",
  warning: "border-l-amber-400/70",
  danger: "border-l-rose-400/70",
  info: "border-l-sky-400/70",
};

const eyebrowStyles: Record<PriorityCardTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

type PriorityActionButtonProps = {
  action: PriorityCardAction;
};

function PriorityActionButton({ action }: PriorityActionButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center rounded-xl border border-slate-200/85 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto";

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

export function PriorityCard({
  title,
  description,
  tone = "neutral",
  eyebrow,
  action,
  meta,
  className = "",
}: PriorityCardProps) {
  return (
    <article
      className={`rounded-2xl border border-slate-200/60 border-l-4 bg-white/95 p-4 shadow-[var(--shadow-card)] sm:p-5 ${accentStyles[tone]} ${className}`}
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
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
          {meta ? (
            <p className="mt-2 text-xs font-medium text-slate-500">{meta}</p>
          ) : null}
        </div>

        {action ? (
          <div className="w-full shrink-0 sm:w-auto">
            <PriorityActionButton action={action} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
