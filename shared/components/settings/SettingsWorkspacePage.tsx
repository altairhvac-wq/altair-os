import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
} from "@/shared/design-system/components/mc-surface";

type SettingsWorkspacePageProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  /** @deprecated MC v2 is the settings surface; kept for call-site compatibility. */
  northStar?: boolean;
};

type SettingsWorkspaceSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** @deprecated MC v2 is the settings surface; kept for call-site compatibility. */
  northStar?: boolean;
  className?: string;
  /** When false, children render without an MC card shell (for nested cards). */
  card?: boolean;
};

export function SettingsWorkspacePage({
  title,
  description,
  children,
}: SettingsWorkspacePageProps) {
  return (
    <article className="min-w-0">
      {/* Compact header: the shell + active tab already name this page, so
       * the in-page header is one slim line, not a second billboard. */}
      <header className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-[var(--north-star-plate-border)] pb-2">
        <h1 className="text-sm font-bold tracking-tight text-altair-ink-on-paper">
          {title}
        </h1>
        <p className="min-w-0 text-xs leading-5 text-altair-ink-on-paper-secondary">
          {description}
        </p>
      </header>
      <div className={`mt-3 flex flex-col ${altairMcGridGapClass}`}>{children}</div>
    </article>
  );
}

export function SettingsWorkspaceSection({
  title,
  description,
  children,
  className,
  card = true,
}: SettingsWorkspaceSectionProps) {
  const body = (
    <>
      {title ? (
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-altair-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );

  if (!card) {
    return <section className={className}>{body}</section>;
  }

  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass} ${className ?? ""}`.trim()}
    >
      {body}
    </section>
  );
}
