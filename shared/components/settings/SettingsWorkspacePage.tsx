import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

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

export type SettingsDestination = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status?: string;
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

export function SettingsDestinationList({
  destinations,
  northStar = false,
}: {
  destinations: readonly SettingsDestination[];
  northStar?: boolean;
}) {
  return (
    <nav aria-label="Settings categories">
      <ul
        className={`divide-y border-y ${
          northStar
            ? "divide-[rgba(138,99,36,0.12)] border-[rgba(138,99,36,0.16)]"
            : "divide-altair-border border-altair-border"
        }`}
      >
        {destinations.map((destination) => {
          const Icon = destination.icon;

          return (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className={`group flex min-w-0 items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 sm:gap-4 ${
                  northStar
                    ? "text-[#17130E]"
                    : "text-altair-ink"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    northStar
                      ? "bg-[#EFE4CB] text-[#8A6324]"
                      : "bg-altair-paper-subtle text-altair-ink-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold sm:text-base">
                      {destination.title}
                    </span>
                    {destination.status ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          northStar
                            ? "bg-[#FFF3D6] text-[#8A6324]"
                            : "bg-altair-paper-subtle text-altair-ink-muted"
                        }`}
                      >
                        {destination.status}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`mt-0.5 block text-sm leading-5 ${
                      northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
                    }`}
                  >
                    {destination.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-altair-brass">
                  <span className="hidden sm:inline">Open</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
