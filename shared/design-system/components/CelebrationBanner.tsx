import Link from "next/link";

export type CelebrationBannerTone = "success" | "info" | "neutral";

export type CelebrationBannerAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type CelebrationBannerProps = {
  title: string;
  description?: string;
  tone?: CelebrationBannerTone;
  action?: CelebrationBannerAction;
  className?: string;
};

const surfaceStyles: Record<CelebrationBannerTone, string> = {
  neutral: "border-slate-200/60 bg-slate-50/80",
  success: "border-emerald-200/55 bg-emerald-50/70",
  info: "border-sky-200/55 bg-sky-50/70",
};

const titleStyles: Record<CelebrationBannerTone, string> = {
  neutral: "text-slate-900",
  success: "text-emerald-900",
  info: "text-sky-900",
};

type CelebrationActionButtonProps = {
  action: CelebrationBannerAction;
};

function CelebrationActionButton({ action }: CelebrationActionButtonProps) {
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

export function CelebrationBanner({
  title,
  description,
  tone = "success",
  action,
  className = "",
}: CelebrationBannerProps) {
  return (
    <aside
      role="status"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5 ${surfaceStyles[tone]} ${className}`}
    >
      <div
        className={`flex flex-col gap-4 ${action ? "sm:flex-row sm:items-center sm:justify-between" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-base font-bold tracking-tight sm:text-lg ${titleStyles[tone]}`}>
            {title}
          </p>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{description}</p>
          ) : null}
        </div>

        {action ? (
          <div className="w-full shrink-0 sm:w-auto">
            <CelebrationActionButton action={action} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
