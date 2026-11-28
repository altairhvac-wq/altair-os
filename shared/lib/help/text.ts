/**
 * The one piece of markup a how-to note may use: `**Label**` for words copied
 * from the screen. Kept this small on purpose, so a note reads the same as
 * plain text (search, the assistant) and as a page.
 */

export type HelpTextSegment = {
  readonly text: string;
  /** True for words copied from the screen. */
  readonly label: boolean;
};

const LABEL_PATTERN = /\*\*([^*]+)\*\*/g;

/** Splits a step into plain words and on-screen labels, in order. */
export function parseHelpText(text: string): HelpTextSegment[] {
  const segments: HelpTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LABEL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), label: false });
    }
    segments.push({ text: match[1], label: true });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), label: false });
  }

  return segments;
}

/** The on-screen labels a step quotes, in order. */
export function helpTextLabels(text: string): string[] {
  return Array.from(text.matchAll(LABEL_PATTERN), (match) => match[1]);
}

/** The step with its markup removed. */
export function plainHelpText(text: string): string {
  return text.replace(LABEL_PATTERN, "$1");
}
