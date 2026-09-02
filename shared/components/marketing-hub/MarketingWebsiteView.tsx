import Link from "next/link";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components/mc-surface";
import { StatusPill } from "@/shared/design-system/components";

/**
 * Website / SEO — what this company has actually published to its own site.
 *
 * ====================== A VIEW, NOT A SECOND CMS ======================
 * Every row is a `marketing_site_pages` row projected server-side. There is no
 * editing here and no second store: a page is written by the publish path from
 * an approved website post, and the SEO details for one live in the post
 * editor's Website panel where they always have. This tab exists so an
 * operator can SEE the published surface without opening posts one at a time.
 *
 * ====================== THE LINK IS THE REAL PAGE ======================
 * A published row links to its live URL, so "published" is a claim the reader
 * can check in one click rather than a status word they have to trust.
 */

export type SitePageRow = {
  readonly slug: string;
  readonly title: string;
  readonly state: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MarketingWebsiteView({
  pages,
}: {
  readonly pages: readonly SitePageRow[];
}) {
  const published = pages.filter((page) => page.state === "published");

  return (
    <div className="space-y-4">
      <section className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <h2 className="text-sm font-semibold text-altair-ink">
          Published to the website
        </h2>
        <p className="mt-1 text-xs text-altair-ink-muted">
          {published.length === 0
            ? "Nothing has been published to the site yet."
            : `${published.length} page${published.length === 1 ? "" : "s"} live. Editing and SEO details are on the post itself, under Content.`}
        </p>
      </section>

      {pages.length === 0 ? (
        <section className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          {/* Not an illustration: "nothing yet" is a real answer, and the next
              step is the useful part of saying it. */}
          <p className="text-xs text-altair-ink-muted">
            A website post that has been approved and published appears here.
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => (
            <li
              key={page.slug}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-altair-ink">
                    {page.title}
                  </span>
                  <span className="block text-xs text-altair-ink-muted">
                    /insights/{page.slug}
                  </span>
                </div>
                <StatusPill
                  tone={page.state === "published" ? "success" : "neutral"}
                  size="sm"
                >
                  {page.state}
                </StatusPill>
              </div>
              <p className="mt-1 text-[11px] text-altair-ink-muted">
                {page.publishedAt
                  ? `Published ${formatWhen(page.publishedAt)}`
                  : "Not published"}
                {" · "}
                Updated {formatWhen(page.updatedAt)}
              </p>
              {page.state === "published" ? (
                <Link
                  href={`/insights/${page.slug}`}
                  className="mt-1 inline-block text-xs text-altair-brass underline underline-offset-4"
                >
                  View the live page
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
