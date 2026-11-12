import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";

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
  "Practical articles for HVAC and field service owners on pricing, estimates, dispatch, invoicing and growing past the first truck.";

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

        <section aria-labelledby="insights-tools-heading" className="mt-14 rounded-2xl border border-stone-200/80 bg-white px-6 py-6 shadow-sm">
          <h2 id="insights-tools-heading" className="text-base font-semibold tracking-tight text-[#0A0A0A]">
            Put a number on it
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Free calculators that answer the questions these articles raise. No account, formulas shown, and your
            numbers stay in your browser.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <Link href="/resources/calculators/labor-rate" className="font-semibold text-[#77591B] hover:underline">
                Labor rate calculator
              </Link>
            </li>
            <li>
              <Link href="/resources/calculators/job-profitability" className="font-semibold text-[#77591B] hover:underline">
                Job profitability calculator
              </Link>
            </li>
            <li>
              <Link href="/resources/calculators/break-even" className="font-semibold text-[#77591B] hover:underline">
                Break-even calculator
              </Link>
            </li>
            <li>
              <Link href="/resources/templates" className="font-semibold text-[#77591B] hover:underline">
                Free templates
              </Link>
            </li>
          </ul>
        </section>

        <p className="mt-8 text-center text-sm text-stone-600">
          Want to see the software these articles keep pointing at?{" "}
          <Link href={VIDEO_PAGE_PATH} className="font-semibold text-[#77591B] hover:underline">
            Watch one job go from first call to paid (2:27)
          </Link>
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
