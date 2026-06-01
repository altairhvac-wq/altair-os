import type { ReactNode } from "react";

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
}: ListCommandCenterLayoutProps) {
  return (
    <div
      className={`flex flex-col gap-3 lg:gap-4 lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden ${className ?? ""}`}
    >
      {banners}

      <header className="admin-page-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="admin-heading-eyebrow">{eyebrow}</p>
          ) : null}
          <h1 className="admin-heading-page">{title}</h1>
          <p className="admin-text-helper mt-1 max-w-2xl">{subtitle}</p>
        </div>
        {primaryAction || secondaryAction ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {primaryAction}
          </div>
        ) : null}
      </header>

      {summary}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:overflow-hidden">
        {children}
      </div>
    </div>
  );
}
