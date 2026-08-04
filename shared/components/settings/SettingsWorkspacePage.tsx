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
      <header className="border-b border-[var(--north-star-border)] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-altair-ink-on-paper sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-altair-ink-on-paper-secondary">
          {description}
        </p>
      </header>
      <div className={`mt-5 flex flex-col ${altairMcGridGapClass}`}>{children}</div>
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
        <div className={card ? "mb-3" : "mb-3"}>
          <h2 className="text-base font-semibold text-altair-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-altair-ink-secondary">
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
