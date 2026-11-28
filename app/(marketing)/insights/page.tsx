import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Clock3, Route } from "lucide-react";
import { SOFTWARE_PAGES, SOFTWARE_PAGE_ORDER } from "@/shared/lib/site/internal-links";
import { listPublishedSitePages, type SitePage } from "@/lib/database/queries/marketing-site-pages";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";
import { ToolCard } from "@/shared/components/resources/hub/ToolCards";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { HUB_TOOLS, INTERACTIVE_TOOL_COUNT, toolsForJob, type ToolJob } from "@/shared/lib/resources/tool-hub";
import { RESOURCES_GUIDES_PATH } from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { ARTICLE_TOPICS, ARTICLE_TOOL_NAMES, articlePlanFor, type ArticleTopicId } from "@/shared/lib/site/article-template";
import { CODE_ROUTED_ARTICLES } from "@/shared/lib/site/code-routed-articles";
import { readingMinutes } from "@/shared/lib/site/article-markdown";

/** The two workspaces, featured above the articles. */
const FEATURED_TOOLS = HUB_TOOLS.filter((tool) => tool.workspace);

/** The free tools listed under each topic (the /resources hub's own groups). */
const TOPIC_TOOL_JOB: Record<ArticleTopicId, ToolJob> = { price: "price", paid: "paid", numbers: "plan", grow: "team" };

/**
 * The Insights index: every published Altair site page, grouped by the job
 * it helps with (shared/lib/site/article-template.ts), newest first within
 * a group, with the free tools for that job beside it.
 *
 * Anonymous and indexable, like the article route beneath it. The list is
 * read through the ordinary anon-key client, so migration 187's
 * `page_state = 'published'` policy decides what appears here — a draft is
 * absent because the database refuses to return it, not because this page
 * filtered it. The two slugs answered by code routes carry those pages' own
 * titles (listPublishedSitePages applies the mapping). Nothing here renders
 * database text as HTML.
 */

const TITLE = "HVAC Business Guides and Articles";
const DESCRIPTION =
  "Guides for HVAC owners on pricing, invoicing, break-even and growth. Worked examples, and a free tool built into each one. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: SITE_PAGE_PATH_PREFIX, title: TITLE, description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function ArticleCard({ page }: { readonly page: SitePage }) {
  const plan = articlePlanFor(page.slug);
  const codeRouted = page.slug in CODE_ROUTED_ARTICLES;
  const badge = codeRouted ? (page.slug === "hvac-invoice-template" ? "Guide + invoice builder" : "Guide + workspace") : plan.tool ? `Built-in ${ARTICLE_TOOL_NAMES[plan.tool.id].toLowerCase()}` : null;
  return (
    <Link
      href={`${SITE_PAGE_PATH_PREFIX}/${page.slug}`}
      data-track={`next-guide-${page.slug}`.slice(0, 64)}
      className={`group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-[#c2a05a] hover:shadow-md sm:p-6 ${focusRing}`}
    >
      {badge ? (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-[#e8d9ac]">
          <Calculator aria-hidden="true" className="h-3.5 w-3.5" />
          {badge}
        </span>
      ) : null}
      <h3 className="mt-4 text-[1.1rem] font-semibold leading-snug tracking-tight text-[#0A0A0A] group-hover:text-[#77591B]">{page.title}</h3>
      {page.metaDescription ? <p className="mt-2 text-sm leading-relaxed text-stone-600">{page.metaDescription}</p> : null}
      <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-5 text-[13px]">
        <span className="inline-flex items-center gap-1 font-semibold text-[#77591B]">
          {codeRouted ? "Open the guide" : "Read the guide"}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          {codeRouted ? "Guide and tool" : `${readingMinutes(page.bodyMarkdown)} min read`}
          {page.publishedAt && !codeRouted ? <> · {formatDate(page.publishedAt)}</> : null}
        </span>
      </span>
    </Link>
  );
}

export default async function InsightsIndexPage() {
  const pages = await listPublishedSitePages();
  const groups = ARTICLE_TOPICS.map((topic) => ({
    topic,
    pages: pages.filter((page) => articlePlanFor(page.slug).topic === topic.id),
    tools: toolsForJob(TOPIC_TOOL_JOB[topic.id]).filter((tool) => !tool.workspace),
  }));
  // Every listed page belongs to exactly one topic; a newer article without a
  // plan defaults to "Start and grow" (articlePlanFor), so none is dropped.
  const visibleGroups = groups.filter((group) => group.pages.length > 0);

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: SITE_PAGE_PATH_PREFIX,
          parts: pages.map((page) => ({ name: page.title, path: `${SITE_PAGE_PATH_PREFIX}/${page.slug}` })),
        })}
      />
      <HomepageNav />

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Insights</p>
            <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[2.9rem]">
              Guides for HVAC owners, with the math done in the page
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Pricing, invoicing, break-even and growing past the first truck. Most guides work an example through, and each one
              has a free tool built in, so you can put your own numbers in as you read.
            </p>
            <p className="mt-4 text-[13px] text-stone-500">
              {pages.length} {pages.length === 1 ? "guide" : "guides"} · {INTERACTIVE_TOOL_COUNT} free tools · no sign-up
            </p>
          </div>
          <Link
            href={RESOURCES_GUIDES_PATH}
            data-track="next-hub-learning-path"
            className={`group flex items-start gap-4 rounded-2xl bg-[#0d0f0c] p-5 text-[#f3ebdd] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.75)] transition-colors hover:bg-[#151812] ${focusRing}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
              <Route aria-hidden="true" className="h-5 w-5 text-[#e8d9ac]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">New owner?</span>
              <span className="mt-1 block text-[15px] font-semibold text-[#fff9ea]">Follow the learning path</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[#c9bfae]">The guides and tools in the order a new owner needs them, from your rate to your first hire.</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#e8d9ac]">
                Start step 1 <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        </header>

        {visibleGroups.length > 0 ? (
          <nav aria-label="Topics" className="mt-10 flex flex-wrap gap-2">
            {visibleGroups.map(({ topic, pages: topicPages }) => (
              <a
                key={topic.id}
                href={`#topic-${topic.id}`}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-[13px] font-semibold text-stone-700 transition-colors hover:border-[#C2A05A] hover:text-stone-900 ${focusRing}`}
              >
                {topic.label}
                <span className="rounded-full bg-stone-100 px-1.5 text-[11px] tabular-nums text-stone-500">{topicPages.length}</span>
              </a>
            ))}
          </nav>
        ) : null}

        <section aria-labelledby="insights-featured-heading" className="mt-10">
          <h2 id="insights-featured-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
            Start here: two free workspaces with a full guide
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {FEATURED_TOOLS.map((tool) => (
              <li key={tool.id} className="min-w-0">
                <ToolCard tool={tool} featured />
              </li>
            ))}
          </ul>
        </section>

        {pages.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-stone-200/80 bg-white px-6 py-10 text-center text-sm text-stone-600">
            No articles have been published yet. Check back soon.
          </p>
        ) : (
          <div className="mt-14 space-y-14">
            {visibleGroups.map(({ topic, pages: topicPages, tools }) => (
              <section key={topic.id} id={`topic-${topic.id}`} aria-labelledby={`topic-${topic.id}-title`} className="scroll-mt-24">
                <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 id={`topic-${topic.id}-title`} className="text-[1.5rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[1.75rem]">
                      {topic.label}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">{topic.text}</p>
                  </div>
                  <p className="text-xs text-stone-500">
                    {topicPages.length} {topicPages.length === 1 ? "guide" : "guides"}
                  </p>
                </div>
                <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {topicPages.map((page) => (
                    <li key={page.id} className="min-w-0">
                      <ArticleCard page={page} />
                    </li>
                  ))}
                </ul>
                {tools.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Free tools</span>
                    {tools.map((tool) => (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        data-track={`next-tool-${tool.id}`}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 font-medium text-stone-700 transition-colors hover:border-[#C2A05A] hover:text-stone-900 ${focusRing}`}
                      >
                        {tool.shortTitle}
                        <ArrowRight aria-hidden="true" className="h-3 w-3 text-stone-400" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}

        <NextStep
          className="mt-16"
          placement="insights"
          steps={NEXT_STEPS.insights}
          heading="Put a number on it, or see the software"
          intro="Every free tool in one place, the one-job video, and the software these articles keep pointing at."
        />

        <nav aria-label="HVAC software" className="mt-8 text-center text-sm text-stone-600">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {SOFTWARE_PAGE_ORDER.map((path) => (
              <li key={path}>
                <Link href={path} className="font-semibold text-[#77591B] hover:underline">
                  {SOFTWARE_PAGES[path].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <MarketingFooter />
    </div>
  );
}
