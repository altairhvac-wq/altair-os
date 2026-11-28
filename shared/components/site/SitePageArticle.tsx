import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, CalendarClock, Check, ChevronDown, Clock3, ListChecks, Mail } from "lucide-react";
import { ProductBand, ToolPageShell } from "@/shared/components/resources/tools/ToolGuide";
import { NextStep } from "@/shared/components/site/NextStep";
import { ArticleBlocks, ArticleFaq, InlineRuns, type LinkCheck } from "@/shared/components/site/article/ArticleBody";
import { ArticleToc, ReadingProgress } from "@/shared/components/site/article/ArticleToc";
import { ArticleTool } from "@/shared/components/site/article/ArticleTool";
import { ABOUT_PATH, FOUNDER } from "@/shared/lib/site/about";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { SOFTWARE_PAGES, articleLinksFor } from "@/shared/lib/site/internal-links";
import { ARTICLE_NEXT_STEPS, NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { ARTICLE_TOOL_ANCHOR, ARTICLE_TOOL_NAMES, articlePlanFor, articleTopic } from "@/shared/lib/site/article-template";
import type { ArticleView } from "@/shared/lib/site/article-view";
import { PUBLIC_SITE_NAME } from "@/shared/lib/site/public-site";

/**
 * The Insights article template: one published site page, laid out as part
 * of the product rather than a blog column.
 *
 *   header      topic, title, summary, who publishes it, updated date, read time,
 *               and the tool built into the page
 *   left rail   the contents list (sticky, with the section being read); on a
 *               phone the same list folds into "In this article"
 *   body        key takeaways, the article, the tool in the middle, its FAQ
 *   after       who writes this, three related pages, the next-step module and
 *               the software band
 *
 * ====================== NO HTML FROM THE DATABASE ======================
 * The body is parsed into blocks by shared/lib/site/article-markdown.ts and
 * rendered as React elements by ArticleBody; the row's text is never HTML.
 * There is no `dangerouslySetInnerHTML` in this file, and the JSON-LD is
 * emitted by the route through JsonLdScript (serializeJsonLd).
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

export type ArticleSummary = {
  readonly slug: string;
  readonly title: string;
  readonly metaDescription: string | null;
  readonly minutes: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Picks first, then the same topic, then the newest; only pages that are published. */
function relatedFor(slug: string, others: readonly ArticleSummary[]): ArticleSummary[] {
  const plan = articlePlanFor(slug);
  const bySlug = new Map(others.map((article) => [article.slug, article]));
  const picked: ArticleSummary[] = [];
  const add = (article: ArticleSummary | undefined) => {
    if (article && article.slug !== slug && !picked.some((p) => p.slug === article.slug)) picked.push(article);
  };
  plan.related.forEach((pick) => add(bySlug.get(pick)));
  others.filter((article) => articlePlanFor(article.slug).topic === plan.topic).forEach(add);
  others.forEach(add);
  return picked.slice(0, 3);
}

const TOOL_ICON = { "invoice-checklist": ListChecks } as const;

export function SitePageArticle({
  slug,
  title,
  summary,
  view,
  publishedAt,
  updatedAt,
  pathPrefix,
  others,
}: {
  readonly slug: string;
  readonly title: string;
  /** The row's meta description, shown as the summary under the title. */
  readonly summary: string | null;
  readonly view: ArticleView;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly pathPrefix: string;
  /** The other published articles, newest first, with the titles their cards use. */
  readonly others: readonly ArticleSummary[];
}) {
  const topic = view.topic;
  const toolName = view.tool ? ARTICLE_TOOL_NAMES[view.tool] : null;
  const ToolIcon = view.tool && view.tool in TOOL_ICON ? TOOL_ICON[view.tool as keyof typeof TOOL_ICON] : Calculator;
  const related = relatedFor(slug, others);
  const software = SOFTWARE_PAGES[articleLinksFor(slug).software];
  const steps = ARTICLE_NEXT_STEPS[slug];
  const sections = view.toc.filter((item) => !item.tool).length;

  // An /insights link in the text must open a published article (or one of the
  // two code routes, which are published rows too); anything else there would
  // be a 404, so it is shown as plain text instead.
  const live = new Set([slug, ...others.map((article) => article.slug)]);
  const isLive: LinkCheck = (href) => {
    const match = /^\/insights\/([a-z0-9-]+)(?:[?#].*)?$/.exec(href);
    return match ? live.has(match[1]) : true;
  };
  const updated = formatDate(updatedAt);
  const published = publishedAt ? formatDate(publishedAt) : null;

  return (
    <ToolPageShell>
      <ReadingProgress />
      <header className="mx-auto max-w-6xl px-4 pt-24 sm:px-8 sm:pt-28">
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li className="flex items-center gap-1.5">
              <Link href={pathPrefix} className={`rounded-sm hover:text-[#77591B] ${focusRing}`}>
                Insights
              </Link>
              <span aria-hidden="true">/</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Link href={`${pathPrefix}#topic-${topic.id}`} className={`rounded-sm hover:text-[#77591B] ${focusRing}`}>
                {topic.label}
              </Link>
              <span aria-hidden="true">/</span>
            </li>
            <li aria-current="page" className="text-stone-600">
              Article
            </li>
          </ol>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
          <div className="min-w-0 max-w-3xl">
            <Link
              href={`${pathPrefix}#topic-${topic.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/40 hover:bg-amber-100/70 ${focusRing}`}
            >
              {topic.label}
            </Link>
            <h1 className="mt-4 text-[2.05rem] font-semibold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[2.8rem]">{title}</h1>
            {summary ? <p className="mt-4 max-w-2xl text-[1.075rem] leading-relaxed text-stone-600 sm:text-lg">{summary}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-stone-600">
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d0f0c] text-[13px] font-semibold text-[#e8d9ac] ring-2 ring-white"
                >
                  A
                </span>
                <span>
                  By the <span className="font-semibold text-stone-900">{PUBLIC_SITE_NAME} team</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarClock aria-hidden="true" className="h-4 w-4 text-stone-400" />
                Updated <time dateTime={updatedAt}>{updated}</time>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-stone-400" />
                {view.minutes} min read
              </span>
            </div>
          </div>

          {toolName ? (
            <div className="rounded-2xl bg-[#0d0f0c] p-5 text-[#f3ebdd] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.75)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">Built into this guide</p>
              <p className="mt-3 flex items-center gap-2.5 text-[15px] font-semibold text-[#fff9ea]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
                  <ToolIcon aria-hidden="true" className="h-4 w-4 text-[#e8d9ac]" />
                </span>
                {toolName}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#c9bfae]">Free, in the page, no sign-up. It opens with this guide&apos;s example.</p>
              <a
                href={`#${ARTICLE_TOOL_ANCHOR}`}
                className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#a4823a] px-4 text-[13px] font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
              >
                Jump to the {toolName.toLowerCase()}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
              <p className="mt-3 flex justify-between text-[11px] text-[#8e826f]">
                <span>{sections} sections</span>
                <span>{view.minutes} min read</span>
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 px-4 sm:mt-12 sm:px-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:gap-14">
        <aside className="hidden lg:block">{view.toc.length >= 2 ? <ArticleToc items={view.toc} minutes={view.minutes} /> : null}</aside>

        <article className="min-w-0">
          {view.toc.length >= 2 ? (
            <details className="group mb-8 max-w-[44rem] rounded-xl border border-stone-200 bg-white lg:hidden">
              <summary
                className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13px] font-semibold text-stone-900 [&::-webkit-details-marker]:hidden ${focusRing}`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen aria-hidden="true" className="h-4 w-4 text-stone-500" />
                  In this article
                  <span className="font-normal text-stone-500">· {view.toc.length} parts</span>
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" />
              </summary>
              <ol className="border-t border-stone-100 px-2 py-2 text-[14px]">
                {view.toc.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className={`flex min-h-10 items-center gap-3 rounded-lg px-2 text-stone-700 hover:bg-stone-50 ${focusRing}`}>
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-stone-400">{index + 1}</span>
                      <span className={item.tool ? "font-semibold text-[#77591B]" : ""}>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}

          {view.takeaways.length > 0 ? (
            <section
              aria-labelledby="key-takeaways"
              className="mb-10 max-w-[44rem] rounded-2xl border border-[#C2A05A]/45 bg-gradient-to-br from-amber-50/80 via-white to-white p-5 shadow-sm sm:p-6"
            >
              <h2 id="key-takeaways" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
                Key takeaways
              </h2>
              <ul className="mt-3 space-y-2.5">
                {view.takeaways.map((item, index) => (
                  <li key={index} className="flex gap-3 text-[15.5px] leading-relaxed text-stone-800">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A4823A] text-[#080907]">
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <InlineRuns runs={item} isLive={isLive} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div data-article-body="">
            {view.segments.map((segment, index) => {
              if (segment.kind === "tool") return <ArticleTool key={`tool-${index}`} id={segment.id} />;
              if (segment.kind === "faq") return <ArticleFaq key={`faq-${index}`} heading={segment.heading} entries={segment.entries} isLive={isLive} />;
              return <ArticleBlocks key={`blocks-${index}`} blocks={segment.blocks} lead={segment.lead} continues={segment.continues} isLive={isLive} />;
            })}
          </div>

          <aside aria-label="Who writes these guides" className="mt-14 max-w-[44rem] rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0d0f0c] text-lg font-semibold text-[#e8d9ac]"
              >
                A
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Written and published by</p>
                <p className="mt-0.5 text-[15px] font-semibold text-stone-900">The {PUBLIC_SITE_NAME} team</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  {PUBLIC_SITE_NAME} is built by {FOUNDER.name}, who owns an HVAC company. These guides are written for owners who want
                  to price, bill and plan from their own numbers.{" "}
                  <Link href={ABOUT_PATH} data-track="next-guide-about" className={`font-medium text-[#77591B] underline-offset-4 hover:underline ${focusRing}`}>
                    About us
                  </Link>
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span>
                    {published ? (
                      <>
                        Published <time dateTime={publishedAt ?? undefined}>{published}</time> ·{" "}
                      </>
                    ) : null}
                    Updated <time dateTime={updatedAt}>{updated}</time>
                  </span>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className={`inline-flex items-center gap-1 rounded-sm font-medium text-stone-600 hover:text-stone-900 ${focusRing}`}>
                    <Mail aria-hidden="true" className="h-3.5 w-3.5" />
                    Spotted a mistake? {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </aside>
        </article>
      </div>

      <div className="mx-auto mt-14 max-w-6xl space-y-8 px-4 pb-16 sm:px-8">
        {related.length > 0 ? (
          <nav aria-labelledby="read-next-heading" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Related reading</p>
            <h2 id="read-next-heading" className="mt-2 text-xl font-semibold tracking-tight text-[#0A0A0A] sm:text-[1.4rem]">
              Read next
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {related.map((article) => {
                const articleTopicLabel = articleTopic(articlePlanFor(article.slug).topic).label;
                return (
                  <li key={article.slug} className="min-w-0">
                    <Link
                      href={`${pathPrefix}/${article.slug}`}
                      data-track={`next-guide-${article.slug}`.slice(0, 64)}
                      className={`group flex h-full flex-col rounded-xl border border-stone-200 bg-stone-50/60 p-4 transition-colors hover:border-[#c2a05a] hover:bg-white sm:p-5 ${focusRing}`}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{articleTopicLabel}</span>
                      <span className="mt-2 block text-[15px] font-semibold leading-snug text-[#0A0A0A] group-hover:text-[#77591B]">{article.title}</span>
                      {article.metaDescription ? <span className="mt-1.5 block text-sm leading-relaxed text-stone-600">{article.metaDescription}</span> : null}
                      <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-[13px]">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#77591B]">
                          Read it <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                        <span className="text-xs text-stone-500">{article.minutes} min</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        {/* A hand-chosen tool, guide and software page (next-steps.ts); a newer article gets the hub, the video and the software. */}
        <NextStep placement={`article-${slug}`} steps={steps ?? NEXT_STEPS.insights} heading="Do this next" trial={false} />

        <ProductBand
          headline="Run every job from first call to paid, in one place."
          text="Leads, estimates, dispatch, the technician's phone, invoices and payments on one record. Free for 14 days, no credit card."
          softwareHref={software.href}
          softwareLabel={software.label}
        />
      </div>
    </ToolPageShell>
  );
}
