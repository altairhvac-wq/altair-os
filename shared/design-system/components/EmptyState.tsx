import Link from "next/link";

export type EmptyStateTone = "neutral" | "success" | "warning" | "danger" | "info";

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  tone?: EmptyStateTone;
  className?: string;
};

const accentStyles: Record<EmptyStateTone, string> = {
  neutral: "border-slate-200/65",
  success: "border-emerald-200/55",
  warning: "border-amber-200/55",
  danger: "border-rose-200/55",
  info: "border-sky-200/55",
};

const titleStyles: Record<EmptyStateTone, string> = {
  neutral: "text-slate-900",
  success: "text-emerald-900",
  warning: "text-amber-900",
  danger: "text-rose-900",
  info: "text-sky-900",
};

type EmptyStateActionButtonProps = {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
};

function EmptyStateActionButton({ action, variant }: EmptyStateActionButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto sm:min-w-[9rem]";
  const variantStyles =
    variant === "primary"
      ? "bg-cyan-600 text-white shadow-sm hover:bg-cyan-700 focus-visible:outline-cyan-600"
      : "border border-slate-200/85 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400";

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

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  tone = "neutral",
  className = "",
}: EmptyStateProps) {
  const hasActions = Boolean(action || secondaryAction);

  return (
    <div
      className={`rounded-2xl border border-dashed bg-white/90 px-5 py-10 text-center shadow-[var(--shadow-card)] sm:px-8 sm:py-12 ${accentStyles[tone]} ${className}`}
    >
      <div className="mx-auto max-w-md">
        <h3 className={`text-lg font-bold tracking-tight sm:text-xl ${titleStyles[tone]}`}>
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}

        {hasActions ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            {secondaryAction ? (
              <EmptyStateActionButton action={secondaryAction} variant="secondary" />
            ) : null}
            {action ? <EmptyStateActionButton action={action} variant="primary" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
