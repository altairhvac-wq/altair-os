/**
 * Articles that can be listened to.
 *
 * ============ WHAT AN ENTRY IS ============
 * One recorded reading of one published article: the file, its length, and
 * where each section of the article starts in the recording. The reading is
 * the article's own content said the way a person would say it (a formula
 * line is spoken as a sentence, cents are rounded where the article rounds
 * them), never different advice or different numbers.
 *
 * ============ WHY A LIST IN CODE ============
 * A recording is made, checked against its script by transcript, and
 * listened to by the owner before it is added here. An article with no entry
 * simply has no player. Nothing generates audio at request time, so a visitor
 * never waits for it and never hears a take nobody approved.
 *
 * The voice is an AI copy of the founder's own voice, and the player says so
 * beside the play button.
 *
 * Pure (no imports).
 */

export type ArticleAudioSection = {
  /** The article's own section heading. */
  readonly title: string;
  /** Where that section starts in the recording, in seconds. */
  readonly startSeconds: number;
};

export type ArticleAudio = {
  /** The article's slug under /insights. */
  readonly slug: string;
  /** Public path of the recording. */
  readonly src: string;
  /** Length of the recording in seconds, shown before the file is requested. */
  readonly durationSeconds: number;
  readonly sections: readonly ArticleAudioSection[];
};

export const ARTICLE_AUDIO: readonly ArticleAudio[] = [
  {
    slug: "how-to-calculate-hvac-labor-rate",
    src: "/marketing/audio/how-to-calculate-hvac-labor-rate.mp3",
    durationSeconds: 220,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Start with the loaded hourly cost", startSeconds: 30.7 },
      { title: "Count the hours you pay for but cannot bill", startSeconds: 56.8 },
      { title: "Give every technician a share of the office", startSeconds: 86.1 },
      { title: "Spread the cost over the hours you actually bill", startSeconds: 108.2 },
      { title: "Add the margin you want to keep", startSeconds: 131.4 },
      { title: "The number that moves the rate the most", startSeconds: 151.1 },
      { title: "What to do with your number", startSeconds: 186.2 },
    ],
  },
];

export function findArticleAudio(slug: string): ArticleAudio | null {
  return ARTICLE_AUDIO.find((entry) => entry.slug === slug) ?? null;
}

/** "4 min", rounded to the nearest minute and never less than one. */
export function listenLength(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** The section being read at a given moment of the recording. */
export function sectionAt(
  sections: readonly ArticleAudioSection[],
  seconds: number,
): ArticleAudioSection | null {
  let current: ArticleAudioSection | null = null;
  for (const section of sections) {
    if (section.startSeconds <= seconds) current = section;
  }
  return current;
}
