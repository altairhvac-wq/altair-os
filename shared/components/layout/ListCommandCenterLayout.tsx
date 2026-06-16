import type { ReactNode } from "react";

/**
 * @deprecated Superseded by `MasterListPageLayout` (`shared/design-system/shell/`).
 * No migrated list pages import this component. Retained until a later cleanup pass
 * confirms no external references remain.
 */
type ListCommandCenterLayoutProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  banners?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Slimmer title bar and tighter vertical rhythm for list pages on mobile */
  density?: "default" | "compact";
};

export function ListCommandCenterLayout({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  banners,
  summary,
  children,
  className,
  density = "default",
}: ListCommandCenterLayoutProps) {
  const isCompact = density === "compact";

  return (
    <div
      className={`flex flex-col ${isCompact ? "gap-2 lg:gap-3" : "gap-3 lg:gap-4"} lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden ${className ?? ""}`}
    >
      {banners}

      <header
        className={`admin-page-header flex shrink-0 justify-between gap-2 ${
          isCompact
            ? "items-center px-3 py-2 sm:px-3.5"
            : "flex-wrap items-start gap-3"
        }`}
      >
        <div className={`min-w-0 ${isCompact ? "flex flex-1 items-baseline gap-2" : ""}`}>
          {eyebrow ? (
            <p className="admin-heading-eyebrow">{eyebrow}</p>
          ) : null}
          <h1
            className={
              isCompact
                ? "shrink-0 text-base font-bold tracking-tight text-slate-900 sm:text-lg"
                : "admin-heading-page"
            }
          >
            {title}
          </h1>
          {isCompact ? (
            <p className="min-w-0 truncate text-xs text-slate-500">{subtitle}</p>
          ) : (
            <p className="admin-text-helper mt-1 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {primaryAction || secondaryAction ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {primaryAction}
          </div>
        ) : null}
      </header>

      {summary}

      <div className="flex min-h-0 min-w-0 lg:flex-1 flex-col gap-3 lg:overflow-hidden">
        {children}
      </div>
    </div>
  );
}
