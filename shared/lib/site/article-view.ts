import {
  blocksText,
  extractFaq,
  extractTakeaways,
  parseArticleMarkdown,
  readingMinutes,
  type Block,
  type FaqEntry,
  type Inline,
} from "./article-markdown";
import {
  ARTICLE_TOOL_ANCHOR,
  ARTICLE_TOOL_NAMES,
  articlePlanFor,
  articleTopic,
  type ArticleToolId,
  type ArticleTopic,
} from "./article-template";

/**
 * One article, laid out for the template: the parsed body cut into the
 * pieces the page renders in order (text, the built-in tool, the FAQ), the
 * contents list, the takeaways and the facts the JSON-LD needs. The page and
 * the route both read this, so what the structured data claims (an FAQ, a
 * section) is exactly what the page shows.
 *
 * Pure (relative imports only), so the verifier can load it.
 */

export type ArticleSegment =
  | { readonly kind: "blocks"; readonly blocks: readonly Block[]; readonly lead: boolean; readonly continues: boolean }
  | { readonly kind: "tool"; readonly id: ArticleToolId }
  | { readonly kind: "faq"; readonly heading: Extract<Block, { kind: "heading" }>; readonly entries: readonly FaqEntry[] };

export type ArticleView = {
  readonly topic: ArticleTopic;
  readonly minutes: number;
  readonly wordCount: number;
  readonly takeaways: readonly (readonly Inline[])[];
  /** true when the takeaways came from the body itself rather than the code map. */
  readonly takeawaysFromBody: boolean;
  readonly segments: readonly ArticleSegment[];
  readonly toc: readonly { readonly id: string; readonly label: string; readonly tool?: boolean }[];
  readonly tool: ArticleToolId | null;
  readonly faq: readonly { readonly question: string; readonly answer: string }[];
  readonly blocks: readonly Block[];
};

const isH2 = (block: Block): block is Extract<Block, { kind: "heading" }> => block.kind === "heading" && block.level === 2;

export function buildArticleView(slug: string, bodyMarkdown: string): ArticleView {
  const plan = articlePlanFor(slug);
  const parsed = parseArticleMarkdown(bodyMarkdown);

  const own = extractTakeaways(parsed);
  const blocks = own ? own.rest : parsed;
  const takeaways: readonly (readonly Inline[])[] = own
    ? own.items
    : plan.takeaways.map((text) => [{ kind: "text", text }] as const);

  const faq = extractFaq(blocks);
  const faqStart = faq ? faq.start : blocks.length;
  const faqEnd = faq ? faq.end : blocks.length;

  // Where the tool goes: before the first preferred H2 that exists, else the
  // middle H2, and never inside or after the FAQ.
  let toolAt: number | null = null;
  if (plan.tool) {
    const ids = new Map<string, number>();
    blocks.forEach((block, index) => {
      if (isH2(block) && index < faqStart && !ids.has(block.id)) ids.set(block.id, index);
    });
    const preferred = plan.tool.before.map((id) => ids.get(id)).find((index) => index !== undefined);
    if (preferred !== undefined) toolAt = preferred;
    else {
      const h2s = [...ids.values()];
      toolAt = h2s.length >= 2 ? h2s[Math.floor(h2s.length / 2)] : faqStart;
    }
  }

  const segments: ArticleSegment[] = [];
  const pushBlocks = (from: number, to: number) => {
    if (to <= from) return;
    segments.push({ kind: "blocks", blocks: blocks.slice(from, to), lead: from === 0, continues: from > 0 });
  };
  if (toolAt !== null && plan.tool) {
    pushBlocks(0, toolAt);
    segments.push({ kind: "tool", id: plan.tool.id });
    pushBlocks(toolAt, faqStart);
  } else {
    pushBlocks(0, faqStart);
  }
  if (faq) segments.push({ kind: "faq", heading: faq.heading, entries: faq.entries });
  pushBlocks(faqEnd, blocks.length);

  const toc: { id: string; label: string; tool?: boolean }[] = [];
  for (const segment of segments) {
    if (segment.kind === "blocks") for (const block of segment.blocks) if (isH2(block)) toc.push({ id: block.id, label: block.text });
    if (segment.kind === "tool") toc.push({ id: ARTICLE_TOOL_ANCHOR, label: `Try it: ${ARTICLE_TOOL_NAMES[segment.id].toLowerCase()}`, tool: true });
    if (segment.kind === "faq") toc.push({ id: segment.heading.id, label: segment.heading.text });
  }

  return {
    topic: articleTopic(plan.topic),
    minutes: readingMinutes(bodyMarkdown),
    wordCount: bodyMarkdown.split(/\s+/).filter(Boolean).length,
    takeaways,
    takeawaysFromBody: Boolean(own),
    segments,
    toc,
    tool: plan.tool?.id ?? null,
    faq: faq ? faq.entries.map((entry) => ({ question: entry.question, answer: blocksText(entry.answer) })) : [],
    blocks,
  };
}
