import {
  altairMcCardClass,
  altairMcCardPadClass,
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
  /** Anchor target, so a deep link can land on this section. */
  id?: string;
};

export function SettingsWorkspacePage({
  title,
  description,
  children,
}: SettingsWorkspacePageProps) {
  return (
    <article className="min-w-0">
      {/* The section's own heading: an h2, since the shell owns the page's
       * one h1 ("Settings"). The description gets a line to itself. */}
      <header className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight text-altair-ink-on-paper">
          {title}
        </h2>
        <p className="mt-0.5 text-sm leading-relaxed text-altair-ink-on-paper-secondary">
          {description}
        </p>
      </header>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </article>
  );
}

export function SettingsWorkspaceSection({
  title,
  description,
  children,
  className,
  card = true,
  id,
}: SettingsWorkspaceSectionProps) {
  const body = (
    <>
      {title ? (
        <div className="mb-3">
          <h3 className="text-[15px] font-bold tracking-tight text-altair-ink">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-altair-ink-secondary">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );

  if (!card) {
    return (
      <section id={id} className={className}>
        {body}
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`${altairMcCardClass} ${altairMcCardPadClass} ${className ?? ""}`.trim()}
    >
      {body}
    </section>
  );
}
