import Link from "next/link";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { serializeJsonLd } from "@/shared/lib/site/structured-data";

/**
 * Renders one published site page.
 *
 * ====================== NO HTML FROM THE DATABASE ======================
 * The body is markdown and is rendered as TEXT. There is no
 * `dangerouslySetInnerHTML` here and none may be added without a
 * sanitisation decision written beside it: the body is written by a
 * generator, and a generator that can put arbitrary HTML on a public page
 * can put script on it.
 *
 * The markdown handled is deliberately the small subset an article needs —
 * headings, paragraphs, list items. Anything else renders as its literal
 * text, which is visibly wrong rather than silently dangerous. A full
 * markdown renderer is a dependency decision, not a detail to slip in here.
 */

type Block =
  | { readonly kind: "heading"; readonly level: 2 | 3; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "list"; readonly items: readonly string[] };

/** Exported for its verifier: the parse is the whole rendering decision. */
export function parseArticleBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ kind: "list", items: list });
      list = [];
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2],
      });
      continue;
    }

    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** Stable in-page anchor for a heading (used by the "In this article" list). */
export function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** About 230 words a minute, rounded up, at least one. */
function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 230));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Free tools every article can point to: they answer the next question an owner has. */
const FREE_TOOLS: readonly { href: string; label: string; text: string }[] = [
  {
    href: "/resources/calculators/labor-rate",
    label: "Labor rate calculator",
    text: "The hourly rate a technician has to bill to cover wage, burden, overhead and margin.",
  },
  {
    href: "/resources/calculators/job-profitability",
    label: "Job profitability calculator",
    text: "Gross profit, net profit and margin on a single job.",
  },
  {
    href: "/resources/calculators/break-even",
    label: "Break-even calculator",
    text: "How many jobs a month it takes to cover your fixed costs.",
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

type ArticleSummary = {
  readonly slug: string;
  readonly title: string;
  readonly metaDescription: string | null;
};

export function SitePageArticle({
  title,
  bodyMarkdown,
  publishedAt,
  updatedAt,
  structuredData,
  internalLinks,
  pathPrefix,
  moreArticles = [],
}: {
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly structuredData: Record<string, unknown>;
  readonly internalLinks: readonly string[];
  readonly pathPrefix: string;
  /** Other published articles, newest first, excluding this one. */
  readonly moreArticles?: readonly ArticleSummary[];
}) {
  const blocks = parseArticleBlocks(bodyMarkdown);
  const hasStructuredData = Object.keys(structuredData).length > 0;
  const sections = blocks.filter(
    (block): block is Extract<Block, { kind: "heading" }> =>
      block.kind === "heading" && block.level === 2,
  );
  const minutes = readingMinutes(bodyMarkdown);
  // The generator's own "read next" picks come first, then the newest of the rest.
  const byslug = new Map(
    moreArticles.map((article) => [article.slug, article]),
  );
  const readNext: ArticleSummary[] = [
    ...internalLinks.map(
      (slug) =>
        byslug.get(slug) ?? {
          slug,
          title: slug.replace(/-/g, " "),
          metaDescription: null,
        },
    ),
    ...moreArticles.filter((article) => !internalLinks.includes(article.slug)),
  ].slice(0, 3);

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <HomepageNav />
      {/* <main>: without it screen readers have no "skip to the article" landmark. */}
      <main>
      <article className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
        {hasStructuredData ? (
          <script
            type="application/ld+json"
            // Serialised and escaped above; never raw database text.
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(structuredData),
            }}
          />
        ) : null}

        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <Link
            href={pathPrefix}
            className={`hover:text-[#77591B] ${focusRing}`}
          >
            Insights
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-stone-600">Article</span>
        </nav>

        <header className="mt-4 border-b border-stone-200 pb-8">
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#0A0A0A] sm:text-[2.6rem]">
            {title}
          </h1>
          <p className="mt-4 text-sm text-stone-500">
            {publishedAt ? (
              <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            ) : null}
            {publishedAt && formatDate(updatedAt) !== formatDate(publishedAt) ? (
              <>
                {" · updated "}
                <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
              </>
            ) : null}
            {publishedAt ? " · " : ""}
            {minutes} min read
          </p>
        </header>

        {sections.length >= 3 ? (
          <nav
            aria-label="In this article"
            className="mt-8 rounded-2xl border border-stone-200 bg-white/80 px-6 py-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              In this article
            </p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {sections.map((section) => (
                <li key={section.text}>
                  <a
                    href={`#${headingAnchor(section.text)}`}
                    className={`text-stone-700 hover:text-[#77591B] ${focusRing}`}
                  >
                    {section.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="mt-10 space-y-6 text-[1.0625rem] leading-8 text-stone-800">
          {blocks.map((block, index) => {
            if (block.kind === "heading") {
              return block.level === 2 ? (
                <h2
                  key={index}
                  id={headingAnchor(block.text)}
                  className="scroll-mt-28 pt-6 text-[1.6rem] font-semibold leading-snug tracking-tight text-[#0A0A0A]"
                >
                  {block.text}
                </h2>
              ) : (
                <h3
                  key={index}
                  className="pt-2 text-xl font-semibold text-[#0A0A0A]"
                >
                  {block.text}
                </h3>
              );
            }

            if (block.kind === "list") {
              return (
                <ul
                  key={index}
                  className="list-disc space-y-2 pl-6 marker:text-[#a4823a]"
                >
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              );
            }

            return <p key={index}>{block.text}</p>;
          })}
        </div>

        <aside
          aria-label="Try Altair Operating System"
          className="mt-14 rounded-2xl bg-[#0d0f0c] px-6 py-7 text-[#f3ebdd] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:px-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
            Altair Operating System
          </p>
          <p className="mt-2 text-xl font-semibold text-[#fff9ea] sm:text-2xl">
            Run every job from first call to paid, in one place.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">
            Leads, estimates, dispatch, the technician&apos;s phone, invoices
            and payments on one record. Free for 14 days, no credit card.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#a4823a] px-6 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              Start your free trial
            </Link>
            <Link
              href={VIDEO_PAGE_PATH}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.2)] px-6 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.4)] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              Watch one job, start to finish (2:27)
            </Link>
          </div>
        </aside>

        <section aria-labelledby="free-tools-heading" className="mt-12">
          <h2
            id="free-tools-heading"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500"
          >
            Free tools for owners
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {FREE_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={`block h-full rounded-xl border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-[#c2a05a] ${focusRing}`}
                >
                  <span className="block text-sm font-semibold text-[#0A0A0A]">
                    {tool.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-600">
                    {tool.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {readNext.length > 0 ? (
          <nav
            aria-labelledby="read-next-heading"
            className="mt-12 border-t border-stone-200 pt-8"
          >
            <h2
              id="read-next-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500"
            >
              Read next
            </h2>
            <ul className="mt-4 space-y-4">
              {readNext.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`${pathPrefix}/${article.slug}`}
                    className={`group block ${focusRing}`}
                  >
                    <span className="block text-base font-semibold text-[#0A0A0A] group-hover:text-[#77591B]">
                      {article.title}
                    </span>
                    {article.metaDescription ? (
                      <span className="mt-1 block text-sm leading-relaxed text-stone-600">
                        {article.metaDescription}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
