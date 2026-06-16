import type { ReactNode } from "react";
import type { MasterShellDensity } from "./tokens";

export type MasterPageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Slimmer title bar for dense list pages */
  density?: MasterShellDensity;
  className?: string;
};

export function MasterPageHeader({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  density = "default",
  className = "",
}: MasterPageHeaderProps) {
  const isCompact = density === "compact";
  const hasActions = Boolean(primaryAction || secondaryAction);
  const actionRowClass = isCompact
    ? "flex shrink-0 items-center gap-2"
    : "flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center";

  return (
    <header
      className={`admin-page-header flex shrink-0 justify-between gap-2 ${
        isCompact
          ? "items-start px-3 py-2 sm:items-center sm:px-3.5"
          : "flex-wrap items-start gap-3"
      } ${className}`}
    >
      <div className={`min-w-0 flex-1 ${isCompact ? "space-y-0.5" : ""}`}>
        {eyebrow ? <p className="admin-heading-eyebrow">{eyebrow}</p> : null}
        {isCompact ? (
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <h1 className="min-w-0 text-base font-bold tracking-tight text-slate-900 sm:shrink-0 sm:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="min-w-0 text-xs leading-snug text-slate-500 sm:truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <h1 className="admin-heading-page">{title}</h1>
            {subtitle ? (
              <p className="admin-text-helper mt-1 max-w-2xl">{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      {hasActions ? (
        <div className={actionRowClass}>
          {secondaryAction}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
