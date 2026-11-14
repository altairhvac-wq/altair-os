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
  {
    slug: "hvac-break-even-jobs-per-month",
    src: "/marketing/audio/hvac-break-even-jobs-per-month.mp3",
    durationSeconds: 186,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Step 1: add up your fixed monthly costs", startSeconds: 29.9 },
      { title: "Step 2: know your average job revenue", startSeconds: 45.7 },
      { title: "Step 3: know your variable cost rate", startSeconds: 58.8 },
      { title: "Step 4: find what each job contributes", startSeconds: 75.9 },
      { title: "Step 5: divide", startSeconds: 94.3 },
      { title: "Two levers that move the line", startSeconds: 118.4 },
      { title: "Use it to plan the slow months", startSeconds: 147 },
    ],
  },
  {
    slug: "job-profitability-per-job",
    src: "/marketing/audio/job-profitability-per-job.mp3",
    durationSeconds: 203,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Gross profit: what the job made before the office", startSeconds: 24.8 },
      { title: "Net profit: what is left after the job pays its share of the office", startSeconds: 68.8 },
      { title: "The small job that looks fine until it comes back", startSeconds: 96.6 },
      { title: "What to look for when you run your own", startSeconds: 150.6 },
      { title: "Try it with real jobs", startSeconds: 180.6 },
    ],
  },
  {
    slug: "job-completion-to-invoice-gap",
    src: "/marketing/audio/job-completion-to-invoice-gap.mp3",
    durationSeconds: 255,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Where the gap actually forms", startSeconds: 22.4 },
      { title: "What goes missing first", startSeconds: 67.5 },
      { title: "Why chasing technicians does not fix it", startSeconds: 98.6 },
      { title: "Closing the gap", startSeconds: 143.7 },
      { title: "What to check in your own operation", startSeconds: 193.4 },
      { title: "One number worth tracking", startSeconds: 229 },
    ],
  },
  {
    slug: "how-to-start-and-grow-an-hvac-company",
    src: "/marketing/audio/how-to-start-and-grow-an-hvac-company.mp3",
    durationSeconds: 472,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Get the Legal Basics Right Before You Take a Single Job", startSeconds: 40.4 },
      { title: "Budget for What You Actually Need, Not What Looks Good", startSeconds: 126.4 },
      { title: "Price Jobs So You're Profitable, Not Just Busy", startSeconds: 196.7 },
      { title: "Get Your First Customers Without a Reputation Yet", startSeconds: 255 },
      { title: "Know When to Hire Your First Tech", startSeconds: 306.8 },
      { title: "Plan Cash Flow Around HVAC's Seasons, Not Against Them", startSeconds: 358 },
      { title: "Build Systems Before You Need Them", startSeconds: 395.8 },
      { title: "The Bottom Line", startSeconds: 446.1 },
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
