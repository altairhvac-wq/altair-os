import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Block, FaqEntry, Inline, TableAlign } from "@/shared/lib/site/article-markdown";

/**
 * Renders a parsed Insights body (shared/lib/site/article-markdown.ts) as
 * React elements. Every string is a text child, so React escapes it; there
 * is no `dangerouslySetInnerHTML` in this file and none may be added. Links
 * arrive already checked by the parser (same-site paths, in-page anchors,
 * allow-listed sources); an /insights link to an article that is not
 * published is shown as plain text rather than sent to a 404.
 *
 * Server component.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

const linkClass = `rounded-sm font-medium text-[#77591B] underline decoration-[#C2A05A]/50 decoration-1 underline-offset-[5px] transition-colors hover:text-[#5b4413] hover:decoration-[#77591B] ${focusRing}`;

export type LinkCheck = (href: string) => boolean;

function trackLabel(href: string): string {
  const slug = href
    .replace(/^\/+/, "")
    .replace(/[?#].*$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
  return `next-intext-${(slug ?? "home").toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`.slice(0, 64);
}

export function InlineRuns({ runs, isLive }: { readonly runs: readonly Inline[]; readonly isLive: LinkCheck }) {
  return (
    <>
      {runs.map((run, index) => {
        if (run.kind === "text") return run.text;
        if (run.kind === "strong") {
          return (
            <strong key={index} className="font-semibold text-stone-950">
              <InlineRuns runs={run.children} isLive={isLive} />
            </strong>
          );
        }
        if (run.external) {
          return (
            <a key={index} href={run.href} rel="noopener" target="_blank" className={linkClass}>
              <InlineRuns runs={run.children} isLive={isLive} />
              <ArrowUpRight aria-hidden="true" className="ml-0.5 inline h-3.5 w-3.5 align-[-1px]" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          );
        }
        if (run.href.startsWith("#")) {
          return (
            <a key={index} href={run.href} className={linkClass}>
              <InlineRuns runs={run.children} isLive={isLive} />
            </a>
          );
        }
        if (!isLive(run.href)) return <InlineRuns key={index} runs={run.children} isLive={isLive} />;
        return (
          <Link key={index} href={run.href} data-track={trackLabel(run.href)} className={linkClass}>
            <InlineRuns runs={run.children} isLive={isLive} />
          </Link>
        );
      })}
    </>
  );
}

const ALIGN: Record<TableAlign, string> = { left: "text-left", right: "text-right", center: "text-center" };

function BlockView({ block, isLive, first }: { readonly block: Block; readonly isLive: LinkCheck; readonly first: boolean }) {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2
          id={block.id}
          className={`scroll-mt-28 text-[1.5rem] font-semibold leading-snug tracking-tight text-[#0A0A0A] sm:text-[1.7rem] ${
            first ? "" : "mt-12 border-t border-stone-200 pt-10"
          }`}
        >
          <InlineRuns runs={block.inline} isLive={isLive} />
        </h2>
      ) : (
        <h3 id={block.id} className="scroll-mt-28 pt-3 text-[1.2rem] font-semibold leading-snug text-[#0A0A0A]">
          <InlineRuns runs={block.inline} isLive={isLive} />
        </h3>
      );
    case "paragraph":
      return (
        <p>
          <InlineRuns runs={block.inline} isLive={isLive} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol role="list" start={block.start} className="space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[12px] font-semibold tabular-nums text-[#f3ebdd]">
                {block.start + index}
              </span>
              <span className="min-w-0">
                <InlineRuns runs={item} isLive={isLive} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-2.5 pl-6 marker:text-[#a4823a]">
          {block.items.map((item, index) => (
            <li key={index} className="pl-1">
              <InlineRuns runs={item} isLive={isLive} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[30rem] text-[14.5px] leading-snug">
            <thead className="bg-stone-50 text-[11.5px] uppercase tracking-wide text-stone-500">
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index} scope="col" className={`px-4 py-2.5 font-semibold ${ALIGN[block.align[index] ?? "left"]}`}>
                    <InlineRuns runs={cell} isLive={isLive} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row" className={`px-4 py-2.5 font-medium text-stone-900 ${ALIGN[block.align[cellIndex] ?? "left"]}`}>
                        <InlineRuns runs={cell} isLive={isLive} />
                      </th>
                    ) : (
                      <td key={cellIndex} className={`px-4 py-2.5 tabular-nums text-stone-700 ${ALIGN[block.align[cellIndex] ?? "left"]}`}>
                        <InlineRuns runs={cell} isLive={isLive} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** A run of blocks in the article's reading column. */
export function ArticleBlocks({
  blocks,
  isLive,
  lead = false,
  continues = false,
}: {
  readonly blocks: readonly Block[];
  readonly isLive: LinkCheck;
  /** The intro: the first paragraph is set larger. */
  readonly lead?: boolean;
  /** True after a tool or FAQ: the first heading still gets its divider. */
  readonly continues?: boolean;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="max-w-[44rem] space-y-6 text-[1.0625rem] leading-[1.8] text-stone-700 [&_li]:leading-[1.7]">
      {blocks.map((block, index) =>
        lead && index === 0 && block.kind === "paragraph" ? (
          <p key={index} className="text-[1.2rem] leading-[1.7] text-stone-800">
            <InlineRuns runs={block.inline} isLive={isLive} />
          </p>
        ) : (
          <BlockView key={index} block={block} isLive={isLive} first={index === 0 && !continues} />
        ),
      )}
    </div>
  );
}

/** The body's own FAQ, as an accordion. Its FAQPage JSON-LD is built from the same entries. */
export function ArticleFaq({
  heading,
  entries,
  isLive,
}: {
  readonly heading: Extract<Block, { kind: "heading" }>;
  readonly entries: readonly FaqEntry[];
  readonly isLive: LinkCheck;
}) {
  return (
    <section aria-labelledby={heading.id} data-article-faq="" className="max-w-[44rem]">
      <h2
        id={heading.id}
        className="mt-12 scroll-mt-28 border-t border-stone-200 pt-10 text-[1.5rem] font-semibold leading-snug tracking-tight text-[#0A0A0A] sm:text-[1.7rem]"
      >
        {heading.text}
      </h2>
      <div className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {entries.map((entry, index) => (
          <details key={entry.question} className="group open:bg-stone-50/60" open={index === 0}>
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15.5px] font-semibold text-stone-900 [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              <h3 className="min-w-0">{entry.question}</h3>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="space-y-3 px-5 pb-5 text-[15.5px] leading-relaxed text-stone-700">
              {entry.answer.map((block, blockIndex) => (
                <BlockView key={blockIndex} block={block} isLive={isLive} first />
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
