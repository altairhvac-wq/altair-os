import Link from "next/link";
import type { ReactNode } from "react";

export type WorkspaceSectionTone = "neutral" | "success" | "warning" | "danger" | "info";

export type WorkspaceSectionAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type WorkspaceSectionProps = {
  title?: string;
  description?: string;
  action?: WorkspaceSectionAction;
  children: ReactNode;
  tone?: WorkspaceSectionTone;
  className?: string;
};

const accentStyles: Record<WorkspaceSectionTone, string> = {
  neutral: "border-l-slate-300/80",
  success: "border-l-emerald-400/70",
  warning: "border-l-amber-400/70",
  danger: "border-l-rose-400/70",
  info: "border-l-sky-400/70",
};

const eyebrowStyles: Record<WorkspaceSectionTone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-sky-700",
};

type WorkspaceActionButtonProps = {
  action: WorkspaceSectionAction;
};

function WorkspaceActionButton({ action }: WorkspaceActionButtonProps) {
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

export function WorkspaceSection({
  title,
  description,
  action,
  children,
  tone = "neutral",
  className = "",
}: WorkspaceSectionProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section className={`flex flex-col gap-4 sm:gap-5 ${className}`}>
      {hasHeader ? (
        <div
          className={`flex flex-col gap-3 border-l-4 pl-4 sm:gap-4 ${action ? "sm:flex-row sm:items-start sm:justify-between" : ""} ${accentStyles[tone]}`}
        >
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                className={`text-sm leading-relaxed text-slate-600 ${title ? "mt-1" : ""} ${!title ? eyebrowStyles[tone] : ""}`}
              >
                {description}
              </p>
            ) : null}
          </div>

          {action ? (
            <div className="w-full shrink-0 sm:w-auto">
              <WorkspaceActionButton action={action} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div>{children}</div>
    </section>
  );
}
