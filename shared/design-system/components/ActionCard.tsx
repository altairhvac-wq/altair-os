import Link from "next/link";

export type ActionCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type ActionCardAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ActionCardProps = {
  title: string;
  description?: string;
  action: ActionCardAction;
  tone?: ActionCardTone;
  eyebrow?: string;
  meta?: string;
  className?: string;
};

const accentStyles: Record<ActionCardTone, string> = {
  neutral: "border-l-slate-300/80",
  success: "border-l-emerald-400/70",
  warning: "border-l-amber-400/70",
  danger: "border-l-rose-400/70",
  info: "border-l-sky-400/70",
};

const eyebrowStyles: Record<ActionCardTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

type ActionCardButtonProps = {
  action: ActionCardAction;
};

function ActionCardButton({ action }: ActionCardButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto bg-cyan-600 text-white shadow-sm hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600";

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

export function ActionCard({
  title,
  description,
  action,
  tone = "neutral",
  eyebrow,
  meta,
  className = "",
}: ActionCardProps) {
  return (
    <article
      className={`rounded-2xl border border-slate-200/60 border-l-4 bg-white/95 p-4 shadow-[var(--shadow-card)] sm:p-5 ${accentStyles[tone]} ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

        <div className="w-full shrink-0 sm:w-auto">
          <ActionCardButton action={action} />
        </div>
      </div>
    </article>
  );
}
