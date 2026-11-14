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
 * ============ THE INTRO ============
 * Every recording opens with the same short intro (a music sting and "This is
 * Altair Insights. I'm Jeremiah. Let's get into it."), so the article's first
 * word is at ARTICLE_AUDIO_INTRO_SECONDS. Section start times below already
 * include it. A new recording gets the same intro mixed on before it is added.
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

/** Where the article itself starts in every recording, after the shared intro. */
export const ARTICLE_AUDIO_INTRO_SECONDS = 7.1;

export const ARTICLE_AUDIO: readonly ArticleAudio[] = [
  {
    slug: "how-to-calculate-hvac-labor-rate",
    src: "/marketing/audio/how-to-calculate-hvac-labor-rate.mp3",
    durationSeconds: 227,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Start with the loaded hourly cost", startSeconds: 37.8 },
      { title: "Count the hours you pay for but cannot bill", startSeconds: 63.9 },
      { title: "Give every technician a share of the office", startSeconds: 93.2 },
      { title: "Spread the cost over the hours you actually bill", startSeconds: 115.3 },
      { title: "Add the margin you want to keep", startSeconds: 138.5 },
      { title: "The number that moves the rate the most", startSeconds: 158.2 },
      { title: "What to do with your number", startSeconds: 193.3 },
    ],
  },
  {
    slug: "hvac-break-even-jobs-per-month",
    src: "/marketing/audio/hvac-break-even-jobs-per-month.mp3",
    durationSeconds: 193,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Step 1: add up your fixed monthly costs", startSeconds: 37 },
      { title: "Step 2: know your average job revenue", startSeconds: 52.8 },
      { title: "Step 3: know your variable cost rate", startSeconds: 65.9 },
      { title: "Step 4: find what each job contributes", startSeconds: 83 },
      { title: "Step 5: divide", startSeconds: 101.4 },
      { title: "Two levers that move the line", startSeconds: 125.5 },
      { title: "Use it to plan the slow months", startSeconds: 154.1 },
    ],
  },
  {
    slug: "job-profitability-per-job",
    src: "/marketing/audio/job-profitability-per-job.mp3",
    durationSeconds: 210,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Gross profit: what the job made before the office", startSeconds: 31.9 },
      { title: "Net profit: what is left after the job pays its share of the office", startSeconds: 75.9 },
      { title: "The small job that looks fine until it comes back", startSeconds: 103.7 },
      { title: "What to look for when you run your own", startSeconds: 157.7 },
      { title: "Try it with real jobs", startSeconds: 187.7 },
    ],
  },
  {
    slug: "job-completion-to-invoice-gap",
    src: "/marketing/audio/job-completion-to-invoice-gap.mp3",
    durationSeconds: 262,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Where the gap actually forms", startSeconds: 29.5 },
      { title: "What goes missing first", startSeconds: 74.6 },
      { title: "Why chasing technicians does not fix it", startSeconds: 105.7 },
      { title: "Closing the gap", startSeconds: 150.8 },
      { title: "What to check in your own operation", startSeconds: 200.5 },
      { title: "One number worth tracking", startSeconds: 236.1 },
    ],
  },
  {
    slug: "how-to-start-and-grow-an-hvac-company",
    src: "/marketing/audio/how-to-start-and-grow-an-hvac-company.mp3",
    durationSeconds: 478,
    sections: [
      { title: "Introduction", startSeconds: 0 },
      { title: "Get the Legal Basics Right Before You Take a Single Job", startSeconds: 47.5 },
      { title: "Budget for What You Actually Need, Not What Looks Good", startSeconds: 133.5 },
      { title: "Price Jobs So You're Profitable, Not Just Busy", startSeconds: 203.8 },
      { title: "Get Your First Customers Without a Reputation Yet", startSeconds: 262.1 },
      { title: "Know When to Hire Your First Tech", startSeconds: 313.9 },
      { title: "Plan Cash Flow Around HVAC's Seasons, Not Against Them", startSeconds: 365.1 },
      { title: "Build Systems Before You Need Them", startSeconds: 402.9 },
      { title: "The Bottom Line", startSeconds: 453.2 },
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
