import type { ReactNode } from "react";
import type { MasterShellDensity } from "./tokens";

export type MasterPageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Optional center slot between title block and actions (e.g. compact metrics). */
  center?: ReactNode;
  /** Slimmer title bar for dense list pages */
  density?: MasterShellDensity;
  /** Use North Star page header surface instead of legacy admin-page-header */
  surfaceVariant?: "default" | "northStar";
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
  className?: string;
};

export function MasterPageHeader({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  center,
  density = "default",
  surfaceVariant = "default",
  titleClassName = "",
  subtitleClassName = "",
  eyebrowClassName = "",
  className = "",
}: MasterPageHeaderProps) {
  const isCompact = density === "compact";
  const hasActions = Boolean(primaryAction || secondaryAction);
  const hasMobileContent = Boolean(subtitle || eyebrow || hasActions);
  const responsiveTitleClass = "sr-only md:not-sr-only";
  const actionRowClass = isCompact
    ? "flex shrink-0 items-center gap-2"
    : "flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center";

  const surfaceClass =
    surfaceVariant === "northStar" ? "north-star-page-header" : "admin-page-header";

  const layoutClass =
    surfaceVariant === "northStar"
      ? isCompact
        ? center
          ? "items-center gap-3"
          : "items-start sm:items-center"
        : "flex-wrap items-start gap-3"
      : isCompact
        ? center
          ? "items-center gap-3 px-3 py-2 sm:px-3.5"
          : "items-start px-3 py-2 sm:items-center sm:px-3.5"
        : "flex-wrap items-start gap-3";

  return (
    <header
      className={`${surfaceClass} ${hasMobileContent ? "flex" : "hidden md:flex"} shrink-0 gap-2 ${center ? "" : "justify-between"} ${layoutClass} ${className}`}
    >
      <div className={`min-w-0 flex-1 ${isCompact ? "space-y-0.5" : ""}`}>
        {eyebrow ? (
          <p className={eyebrowClassName || "admin-heading-eyebrow"}>{eyebrow}</p>
        ) : null}
        {isCompact ? (
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <h1
              className={`${
                titleClassName ||
                "min-w-0 text-base font-bold tracking-tight text-slate-900 sm:shrink-0 sm:text-lg"
              } ${responsiveTitleClass}`}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={
                  subtitleClassName ||
                  "min-w-0 text-xs leading-snug text-slate-500 sm:truncate"
                }
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <h1 className={`admin-heading-page ${responsiveTitleClass}`}>{title}</h1>
            {subtitle ? (
              <p className="admin-text-helper mt-1 max-w-2xl">{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      {center ? <div className="hidden shrink-0 lg:block">{center}</div> : null}
      {hasActions ? (
        <div className={`${actionRowClass} ${center ? "ml-auto" : ""}`}>
          {secondaryAction}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
