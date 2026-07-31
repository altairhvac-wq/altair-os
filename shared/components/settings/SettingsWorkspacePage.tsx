type SettingsWorkspacePageProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  northStar?: boolean;
};

type SettingsWorkspaceSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  northStar?: boolean;
  className?: string;
};

export function SettingsWorkspacePage({
  title,
  description,
  children,
  northStar = false,
}: SettingsWorkspacePageProps) {
  return (
    <article className="min-w-0">
      <header
        className={`border-b pb-4 ${
          northStar
            ? "border-[rgba(138,99,36,0.16)]"
            : "border-altair-border"
        }`}
      >
        <h1
          className={`text-xl font-bold tracking-tight sm:text-2xl ${
            northStar ? "text-[#17130E]" : "text-altair-ink"
          }`}
        >
          {title}
        </h1>
        <p
          className={`mt-1 max-w-2xl text-sm leading-6 ${
            northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
          }`}
        >
          {description}
        </p>
      </header>
      <div className="mt-5 space-y-7">{children}</div>
    </article>
  );
}

export function SettingsWorkspaceSection({
  title,
  description,
  children,
  northStar = false,
  className,
}: SettingsWorkspaceSectionProps) {
  return (
    <section className={className}>
      {title ? (
        <div className="mb-3">
          <h2
            className={`text-base font-semibold ${
              northStar ? "text-[#17130E]" : "text-altair-ink"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={`mt-1 text-sm leading-6 ${
                northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
