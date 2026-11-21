/**
 * The Insights article markdown: parsed into plain data, never into HTML.
 *
 * ====================== NO HTML FROM THE DATABASE ======================
 * `body_markdown` is written by a generator and stored in
 * marketing_site_pages. This module turns it into blocks and inline runs
 * (text, bold, links) that `ArticleBody` renders as React elements, so every
 * character the database holds reaches the page as escaped text. There is no
 * HTML pass-through: a `<script>` in a body is shown as the literal text
 * `<script>`, and the publish gate refuses it before that anyway.
 *
 * ====================== WHAT IS SUPPORTED ======================
 *   ## and ### headings
 *   paragraphs (consecutive lines joined with a space, as before)
 *   "- " and "* " bullet lists, "1. " numbered lists
 *   simple pipe tables: a header row, a |---|---:| row, body rows
 *   **bold**
 *   [text](/same-site/path) and [text](#anchor)
 *   [text](https://source) only for hosts in ARTICLE_EXTERNAL_HOSTS
 *   \* \[ \] \| \\ escapes
 *
 * Anything else is left as its literal text, which is visibly wrong rather
 * than silently dangerous. A link whose target is not allowed renders as its
 * text without the link, so a bad URL can never reach an `href`.
 *
 * The bodies published before this renderer used only headings, paragraphs
 * and "- " lists, and none of them contains "**", "](", a line starting
 * with "|" or a line starting with a number and a full stop; the verifier
 * (scripts/verify-article-markdown.mjs) pins that their blocks parse the
 * same as they did.
 *
 * Pure (no imports), so the verifier can load it.
 */

export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "strong"; readonly children: readonly Inline[] }
  | {
      readonly kind: "link";
      readonly href: string;
      /** true for an allow-listed source on another site: opens in a new tab with rel="noopener". */
      readonly external: boolean;
      readonly children: readonly Inline[];
    };

export type TableAlign = "left" | "right" | "center";

export type Block =
  | { readonly kind: "heading"; readonly level: 2 | 3; readonly text: string; readonly inline: readonly Inline[]; readonly id: string }
  | { readonly kind: "paragraph"; readonly inline: readonly Inline[] }
  | { readonly kind: "list"; readonly ordered: boolean; readonly start: number; readonly items: readonly (readonly Inline[])[] }
  | {
      readonly kind: "table";
      readonly align: readonly TableAlign[];
      readonly head: readonly (readonly Inline[])[];
      readonly rows: readonly (readonly (readonly Inline[])[])[];
    };

/* =============================================================== links */

/** The public origin; an absolute link to it is treated as a same-site path. */
export const ARTICLE_SITE_ORIGINS: readonly string[] = ["https://www.altair-op.com", "https://altair-op.com"];

/**
 * Other sites an article may link to: the sources the site already cites
 * (the labor rate guide's source list). https only, exact host. Add a host
 * here only when a page cites it as a source.
 */
export const ARTICLE_EXTERNAL_HOSTS: readonly string[] = [
  "www.bls.gov",
  "www.irs.gov",
  "www.kff.org",
  "www.hvac.com",
  "www.ibisworld.com",
];

const SAME_SITE_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/?#=&%+]*$/;
const ANCHOR = /^#[a-z0-9][a-z0-9-]{0,79}$/;
const LINK_MAX = 300;

export type ResolvedLink = { readonly href: string; readonly external: boolean };

/**
 * The href a link target may become, or null when it is not allowed.
 * Same-site paths, in-page anchors and allow-listed https sources only.
 */
export function resolveArticleLink(raw: string): ResolvedLink | null {
  const target = raw.trim();
  if (target === "" || target.length > LINK_MAX || /[\s\\<>"'`]/.test(target)) return null;
  if (ANCHOR.test(target)) return { href: target, external: false };
  if (target.startsWith("/")) return SAME_SITE_PATH.test(target) ? { href: target, external: false } : null;
  if (!target.toLowerCase().startsWith("https://")) return null;

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const origin = `${url.protocol}//${url.host}`.toLowerCase();
  if (ARTICLE_SITE_ORIGINS.includes(origin)) {
    const path = `${url.pathname}${url.search}${url.hash}` || "/";
    return SAME_SITE_PATH.test(path) ? { href: path, external: false } : null;
  }
  if (!ARTICLE_EXTERNAL_HOSTS.includes(url.hostname.toLowerCase())) return null;
  return { href: url.toString(), external: true };
}

/* ============================================================== inline */

const ESCAPABLE = new Set(["*", "[", "]", "|", "\\", "(", ")"]);

/** Plain text of inline runs: for anchors, the table of contents and JSON-LD. */
export function inlineText(runs: readonly Inline[]): string {
  return runs.map((run) => (run.kind === "text" ? run.text : inlineText(run.children))).join("");
}

function pushText(out: Inline[], text: string) {
  if (text === "") return;
  const last = out[out.length - 1];
  if (last && last.kind === "text") out[out.length - 1] = { kind: "text", text: last.text + text };
  else out.push({ kind: "text", text });
}

/** Index of the closing "]" for a "[" at `open`, honouring escapes; -1 if none. */
function findClosingBracket(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Index of the next unescaped "**" at or after `from`; -1 if none. */
function findStrongClose(source: string, from: number): number {
  for (let i = from; i < source.length - 1; i += 1) {
    if (source[i] === "\\") {
      i += 1;
      continue;
    }
    if (source[i] === "*" && source[i + 1] === "*") return i;
  }
  return -1;
}

/**
 * Inline runs for one line of text. `inLink` stops links nesting inside link
 * text; `inStrong` stops bold nesting inside bold.
 */
export function parseInline(source: string, context: { inLink?: boolean; inStrong?: boolean } = {}): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let plain = "";
  const flush = () => {
    pushText(out, plain);
    plain = "";
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\\" && i + 1 < source.length && ESCAPABLE.has(source[i + 1])) {
      plain += source[i + 1];
      i += 2;
      continue;
    }

    if (!context.inStrong && ch === "*" && source[i + 1] === "*") {
      const close = findStrongClose(source, i + 2);
      const inner = close === -1 ? "" : source.slice(i + 2, close);
      if (close !== -1 && inner.trim() !== "" && !/^\s|\s$/.test(inner)) {
        flush();
        out.push({ kind: "strong", children: parseInline(inner, { ...context, inStrong: true }) });
        i = close + 2;
        continue;
      }
    }

    if (!context.inLink && ch === "[") {
      const close = findClosingBracket(source, i);
      if (close !== -1 && source[close + 1] === "(") {
        const end = source.indexOf(")", close + 2);
        if (end !== -1) {
          const label = source.slice(i + 1, close);
          const target = source.slice(close + 2, end);
          const children = parseInline(label, { ...context, inLink: true });
          flush();
          const link = label.trim() === "" ? null : resolveArticleLink(target);
          if (link) out.push({ kind: "link", href: link.href, external: link.external, children });
          else for (const child of children) out.push(child);
          i = end + 1;
          continue;
        }
      }
    }

    plain += ch;
    i += 1;
  }

  flush();
  // Merge text runs that the link fallback may have left side by side.
  const merged: Inline[] = [];
  for (const run of out) {
    if (run.kind === "text") pushText(merged, run.text);
    else merged.push(run);
  }
  return merged;
}

/* ============================================================== blocks */

/** Stable in-page anchor for a heading (the same rule the article page has always used). */
export function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const TABLE_ROW = /^\|.*\|$/;
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;
const TABLE_MAX_COLUMNS = 8;
const TABLE_MAX_ROWS = 40;

/** Cells of one "| a | b |" row; "\|" stays inside a cell. */
function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      cell += "\\|";
      i += 1;
      continue;
    }
    if (inner[i] === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += inner[i];
  }
  cells.push(cell.trim());
  return cells;
}

function alignOf(rule: string): TableAlign {
  const cell = rule.trim();
  if (cell.startsWith(":") && cell.endsWith(":")) return "center";
  if (cell.endsWith(":")) return "right";
  return "left";
}

export function parseArticleMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;
  const usedIds = new Map<string, number>();

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", inline: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push({
        kind: "list",
        ordered: list.ordered,
        start: list.start,
        items: list.items.map((item) => parseInline(item)),
      });
    }
    list = null;
  };
  const uniqueId = (text: string) => {
    const base = headingAnchor(text) || "section";
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const inline = parseInline(heading[2]);
      const text = inlineText(inline);
      blocks.push({ kind: "heading", level: heading[1].length === 2 ? 2 : 3, text, inline, id: uniqueId(text) });
      continue;
    }

    if (TABLE_ROW.test(line) && index + 1 < lines.length && TABLE_RULE.test(lines[index + 1])) {
      flushParagraph();
      flushList();
      const head = splitRow(line).slice(0, TABLE_MAX_COLUMNS);
      const align = splitRow(lines[index + 1]).slice(0, head.length).map(alignOf);
      while (align.length < head.length) align.push("left");
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && TABLE_ROW.test(lines[index])) {
        if (rows.length < TABLE_MAX_ROWS) {
          const cells = splitRow(lines[index]).slice(0, head.length);
          while (cells.length < head.length) cells.push("");
          rows.push(cells);
        }
        index += 1;
      }
      index -= 1;
      blocks.push({
        kind: "table",
        align,
        head: head.map((cell) => parseInline(cell)),
        rows: rows.map((row) => row.map((cell) => parseInline(cell))),
      });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (list && list.ordered) flushList();
      if (!list) list = { ordered: false, start: 1, items: [] };
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^(\d{1,3})\.\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (list && !list.ordered) flushList();
      if (!list) list = { ordered: true, start: Number(numbered[1]), items: [] };
      list.items.push(numbered[2]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/* =============================================== sections the template lifts */

const TAKEAWAYS_HEADING = /^(key takeaways|the short version|in short|at a glance)$/i;
const FAQ_HEADING = /^(frequently asked questions|faqs?|questions owners ask|common questions)$/i;

export type FaqEntry = { readonly question: string; readonly answer: readonly Block[] };

/** A body's own "## Key takeaways" list, if it opens with one. */
export function extractTakeaways(blocks: readonly Block[]): { readonly items: readonly (readonly Inline[])[]; readonly rest: Block[] } | null {
  const at = blocks.findIndex((block) => block.kind === "heading" && block.level === 2 && TAKEAWAYS_HEADING.test(block.text.trim()));
  if (at === -1) return null;
  const list = blocks[at + 1];
  if (!list || list.kind !== "list" || list.items.length === 0) return null;
  const next = blocks[at + 2];
  // Only a heading and its list: anything more is an ordinary section.
  if (next && !(next.kind === "heading" && next.level === 2)) return null;
  return { items: list.items, rest: [...blocks.slice(0, at), ...blocks.slice(at + 2)] };
}

/**
 * The FAQ section, when the body has a real one: an H2 named as questions,
 * then at least two "### question" headings, each answered by at least one
 * paragraph or list before the next question. Returns where it sits so the
 * template can render it in place.
 */
export function extractFaq(blocks: readonly Block[]): { readonly start: number; readonly end: number; readonly heading: Extract<Block, { kind: "heading" }>; readonly entries: readonly FaqEntry[] } | null {
  const start = blocks.findIndex((block) => block.kind === "heading" && block.level === 2 && FAQ_HEADING.test(block.text.trim()));
  if (start === -1) return null;
  let end = blocks.length;
  for (let i = start + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind === "heading" && block.level === 2) {
      end = i;
      break;
    }
  }
  const entries: { question: string; answer: Block[] }[] = [];
  for (let i = start + 1; i < end; i += 1) {
    const block = blocks[i];
    if (block.kind === "heading" && block.level === 3) entries.push({ question: block.text, answer: [] });
    else if (entries.length > 0) entries[entries.length - 1].answer.push(block);
    else return null; // text before the first question: not an FAQ shape
  }
  const valid = entries.length >= 2 && entries.every((entry) => entry.question.trim() !== "" && entry.answer.some((b) => b.kind === "paragraph" || b.kind === "list"));
  if (!valid) return null;
  return { start, end, heading: blocks[start] as Extract<Block, { kind: "heading" }>, entries };
}

/** Plain text of blocks (an FAQ answer), for JSON-LD. */
export function blocksText(blocks: readonly Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "paragraph") return inlineText(block.inline);
      if (block.kind === "heading") return block.text;
      if (block.kind === "list") return block.items.map((item) => inlineText(item)).join("; ");
      return block.rows.map((row) => row.map((cell) => inlineText(cell)).join(", ")).join("; ");
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** About 230 words a minute, rounded up, at least one (the article page's long-standing rule). */
export function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 230));
}

/** Same-site paths linked from a body, for the dead-link check. */
export function internalHrefs(blocks: readonly Block[]): string[] {
  const out: string[] = [];
  const walk = (runs: readonly Inline[]) => {
    for (const run of runs) {
      if (run.kind === "link" && !run.external && run.href.startsWith("/")) out.push(run.href);
      if (run.kind !== "text") walk(run.children);
    }
  };
  for (const block of blocks) {
    if (block.kind === "paragraph" || block.kind === "heading") walk(block.inline);
    else if (block.kind === "list") block.items.forEach(walk);
    else if (block.kind === "table") {
      block.head.forEach(walk);
      block.rows.forEach((row) => row.forEach(walk));
    }
  }
  return out;
}
