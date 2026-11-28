import { plainHelpText } from "@/shared/lib/help/text";
import type { HelpNote } from "@/shared/lib/help/types";

/**
 * Search lives apart from the catalog so a client component can search the
 * notes it was handed without pulling the whole catalog (and its source-file
 * anchors) into the browser bundle.
 */

/** The parts of a note the search reads. */
export type HelpSearchable = Pick<
  HelpNote,
  "title" | "summary" | "steps" | "goodToKnow" | "alsoAsked"
>;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "a", "an", "and", "at", "can", "do", "does", "for", "from", "how", "i", "in",
  "is", "it", "my", "of", "on", "or", "the", "to", "we", "what", "where", "with",
]);

function tokenize(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Plain word search over a list of notes. A word in the title counts most,
 * then the other ways people ask, then the summary, then the steps. Returns
 * best matches first; an empty or all-filler query returns nothing. This is
 * the same search the assistant's "read a how-to note" lookup will use.
 */
export function searchHelpNotes<Note extends HelpSearchable>(
  notes: readonly Note[],
  query: string,
): Note[] {
  const words = tokenize(query);
  if (words.length === 0) {
    return [];
  }

  const scored: { note: Note; score: number; index: number }[] = [];

  notes.forEach((note, index) => {
    const title = normalize(note.title);
    const otherWays = normalize((note.alsoAsked ?? []).join(" "));
    const summary = normalize(note.summary);
    const body = normalize(
      [...note.steps, ...(note.goodToKnow ?? [])].map(plainHelpText).join(" "),
    );

    // Asking for a note by its name finds that note first.
    const asked = normalize(query);
    let score = title === asked ? 100 : title.includes(asked) ? 20 : 0;
    let matched = 0;
    for (const word of words) {
      const stem = word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
      let wordScore = 0;
      if (title.includes(stem)) wordScore += 6;
      if (otherWays.includes(stem)) wordScore += 4;
      if (summary.includes(stem)) wordScore += 2;
      if (body.includes(stem)) wordScore += 1;
      if (wordScore > 0) matched += 1;
      score += wordScore;
    }

    // Most of the words must land somewhere: a spoken question carries words
    // no note uses ("bought", "please"), but one stray match is not an answer.
    if (matched >= Math.ceil(words.length * 0.6)) {
      scored.push({ note, score, index });
    }
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.note);
}
