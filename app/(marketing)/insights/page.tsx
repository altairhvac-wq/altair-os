import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";

/**
 * The Insights index: every published Altair site page, newest first.
 *
 * Anonymous and indexable, like the article route beneath it. The list is
 * read through the ordinary anon-key client, so migration 187's
 * `page_state = 'published'` policy decides what appears here — a draft is
 * absent because the database refuses to return it, not because this page
 * filtered it. Nothing here renders database text as HTML.
 */

const INSIGHTS_DESCRIPTION =
  "Articles from Altair OS for field service businesses: running leads, customers, jobs, dispatch, technicians, estimates, invoices, payments, and reporting in one connected system.";

export const metadata: Metadata = {
  title: "Insights",
  description: INSIGHTS_DESCRIPTION,
  ...buildPublicSocialMetadata({ path: SITE_PAGE_PATH_PREFIX }),
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function InsightsIndexPage() {
  const pages = await listPublishedSitePages();

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <HomepageNav />

      <main className="relative mx-auto max-w-3xl px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
        <header className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
            Insights
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            Articles for field service businesses
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            {INSIGHTS_DESCRIPTION}
          </p>
        </header>

        {pages.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-stone-200/80 bg-white px-6 py-10 text-center text-sm text-stone-600">
            No articles have been published yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-12 space-y-4">
            {pages.map((page) => {
              const href = `${SITE_PAGE_PATH_PREFIX}/${page.slug}`;
              return (
                <li
                  key={page.id}
                  className="rounded-2xl border border-stone-200/80 bg-white px-6 py-5 shadow-sm"
                >
                  <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                    <Link
                      href={href}
                      className="hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                    >
                      {page.title}
                    </Link>
                  </h2>
                  {page.metaDescription ? (
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      {page.metaDescription}
                    </p>
                  ) : null}
                  {page.publishedAt ? (
                    <p className="mt-3 text-xs text-stone-500">
                      <time dateTime={page.publishedAt}>
                        {formatDate(page.publishedAt)}
                      </time>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
