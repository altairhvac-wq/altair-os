import Link from "next/link";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { RESOURCES_PATH } from "@/shared/lib/resources/catalog";

/**
 * The public frame every Resource Center page shares: the marketing nav and
 * footer the Insights and pricing pages use, a breadcrumb back to the hub,
 * and the same stone/brass palette. No account, no gating.
 *
 * `ResourceChrome` is the outer frame (used directly by the calculators
 * layout); `ResourcePageHeader` is the eyebrow/title/intro block;
 * `ResourcePageShell` is both together for single-file pages.
 */

export type ResourceCrumb = { readonly label: string; readonly href?: string };

export function ResourceChrome({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <HomepageNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function ResourceMain({
  width = "default",
  children,
}: {
  readonly width?: "default" | "wide";
  readonly children: React.ReactNode;
}) {
  const maxWidth = width === "wide" ? "max-w-5xl" : "max-w-3xl";
  return (
    <main className={`relative mx-auto ${maxWidth} px-4 pb-16 pt-24 sm:px-8 sm:pt-28`}>
      {children}
    </main>
  );
}

export function ResourcePageHeader({
  eyebrow,
  title,
  intro,
  crumbs = [],
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: React.ReactNode;
  readonly crumbs?: readonly ResourceCrumb[];
}) {
  const trail: ResourceCrumb[] = [{ label: "Resources", href: RESOURCES_PATH }, ...crumbs];
  const centered = crumbs.length === 0;

  return (
    <>
      {!centered ? (
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            {trail.map((crumb, index) => {
              const last = index === trail.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="rounded-sm hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <header className={centered ? "text-center" : ""}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
          {title}
        </h1>
        <div
          className={[
            "mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg",
            centered ? "mx-auto" : "",
          ].join(" ")}
        >
          {intro}
        </div>
      </header>
    </>
  );
}

export function ResourcePageShell({
  eyebrow,
  title,
  intro,
  crumbs,
  width,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: React.ReactNode;
  readonly crumbs?: readonly ResourceCrumb[];
  readonly width?: "default" | "wide";
  readonly children: React.ReactNode;
}) {
  return (
    <ResourceChrome>
      <ResourceMain width={width}>
        <ResourcePageHeader eyebrow={eyebrow} title={title} intro={intro} crumbs={crumbs} />
        {children}
      </ResourceMain>
    </ResourceChrome>
  );
}

/** A white card in the Insights list style. */
export function ResourceCard({
  children,
  className = "",
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}

export const resourceLinkClass =
  "rounded-sm font-medium text-[#77591B] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";
