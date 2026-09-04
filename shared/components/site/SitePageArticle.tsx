import Link from "next/link";

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

/**
 * JSON-LD, escaped for the one sequence that can break out of a script tag.
 *
 * `JSON.stringify` does not escape `</script>`, and a body or title
 * containing it would end the block and let whatever followed be parsed as
 * markup. Replacing `<` inside the serialised string closes that.
 */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function SitePageArticle({
  title,
  bodyMarkdown,
  publishedAt,
  updatedAt,
  structuredData,
  internalLinks,
  pathPrefix,
}: {
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly structuredData: Record<string, unknown>;
  readonly internalLinks: readonly string[];
  readonly pathPrefix: string;
}) {
  const blocks = parseArticleBlocks(bodyMarkdown);
  const hasStructuredData = Object.keys(structuredData).length > 0;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      {hasStructuredData ? (
        <script
          type="application/ld+json"
          // Serialised and escaped above; never raw database text.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-altair-ink sm:text-4xl">
          {title}
        </h1>
        {publishedAt ? (
          <p className="mt-3 text-sm text-altair-ink-muted">
            <time dateTime={publishedAt}>
              {new Date(publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {updatedAt > publishedAt ? (
              <>
                {" · updated "}
                <time dateTime={updatedAt}>
                  {new Date(updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="space-y-5 text-base leading-7 text-altair-ink">
        {blocks.map((block, index) => {
          if (block.kind === "heading") {
            return block.level === 2 ? (
              <h2
                key={index}
                className="pt-4 text-2xl font-semibold text-altair-ink"
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={index}
                className="pt-2 text-xl font-semibold text-altair-ink"
              >
                {block.text}
              </h3>
            );
          }

          if (block.kind === "list") {
            return (
              <ul key={index} className="list-disc space-y-2 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          }

          return <p key={index}>{block.text}</p>;
        })}
      </div>

      {internalLinks.length > 0 ? (
        <nav
          aria-label="Related pages"
          className="mt-12 border-t border-altair-border pt-6"
        >
          <h2 className="text-sm font-semibold text-altair-ink">Read next</h2>
          <ul className="mt-3 space-y-2">
            {internalLinks.map((slug) => (
              <li key={slug}>
                <Link
                  href={`${pathPrefix}/${slug}`}
                  className="text-sm text-altair-brass underline underline-offset-4"
                >
                  {slug.replace(/-/g, " ")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
