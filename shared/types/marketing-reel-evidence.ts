/**
 * Organic Reel performance, shaped as EVIDENCE for the weekly strategist.
 *
 * ==================== WHY A SHAPING LAYER AT ALL ====================
 * `marketing_metrics` stores one row per metric per delivery per day, under the
 * provider's own vocabulary. That is the right storage shape and the wrong
 * reading shape: the strategist's contract is that it "NEVER computes numbers —
 * it narrates the ones it is given" (roles/strategist.ts:5). Handing it raw
 * rows would force it to do arithmetic it is explicitly forbidden to do, and
 * anything it got wrong would read as fact.
 *
 * So the arithmetic happens here, in code, with tests — and the model receives
 * finished sentences of number.
 *
 * ==================== AND WHY THE SAMPLE RULES ARE IN CODE ====================
 * A model shown two Reels will rank them. It will do so with the same fluency
 * whether they differ by 4,000 views or by four. Telling it "be careful with
 * small samples" in a prompt is a suggestion; computing `sufficiency` here and
 * refusing to present a comparison below the threshold is a rule.
 */

export const REEL_EVIDENCE_SOURCE = "meta_organic_reel";

/**
 * The provider metric names that map onto a shared vocabulary.
 *
 * Facebook and Instagram do not measure the same things under the same names,
 * and after April 2025 Instagram folded impressions/plays/video_views into one
 * `views`. This table is the only place that correspondence is asserted, and
 * `COMPARABLE_ACROSS_PROVIDERS` below records how far it can be trusted.
 */
export const METRIC_ALIASES = {
  facebook: {
    views: "blue_reels_play_count",
    reach: "post_impressions_unique",
    engagement: "post_video_social_actions",
    avgWatchMs: "post_video_avg_time_watched",
    totalWatchMs: "post_video_view_time",
    replays: "fb_reels_replay_count",
  },
  instagram: {
    views: "views",
    reach: "reach",
    engagement: "total_interactions",
  },
} as const;

/**
 * Views and reach are NOT the same measurement on the two providers — a
 * Facebook Reel "play" and an Instagram "view" are counted differently — so a
 * cross-provider ranking is not evidence of anything about the creative.
 * Engagement and watch time are worse still: Instagram reports no watch time at
 * all, so an absence there is a gap in the API, never a Reel nobody watched.
 */
export const COMPARABLE_ACROSS_PROVIDERS = false;

/**
 * Below this, a difference between two Reels is noise dressed as a result.
 * A Reel on 40 views beating one on 30 is not a lesson about hooks.
 */
export const MIN_VIEWS_FOR_COMPARISON = 50;

/** Fewer than this many measured Reels on one provider and nothing is ranked. */
export const MIN_REELS_FOR_COMPARISON = 3;
/** At and above this, a pattern is worth naming rather than merely noting. */
export const MIN_REELS_FOR_PATTERN = 6;

export type ReelEvidenceSufficiency = "insufficient" | "directional" | "comparable";

export type ReelMetricSet = {
  views: number | null;
  reach: number | null;
  engagement: number | null;
  avgWatchMs: number | null;
  totalWatchMs: number | null;
  replays: number | null;
};

export type ReelEvidenceRow = {
  /** The Agent Platform render job. The join everything else hangs off. */
  readonly sourceJobId: string;
  /** What the Reel was about, from the post's own title. */
  readonly story: string;
  /**
   * The opening line AS PUBLISHED.
   *
   * Taken from the post text rather than from the reel spec on purpose: if the
   * founder rewrote the caption on Today before approving, the rewritten words
   * are the ones that earned these numbers.
   */
  readonly hook: string;
  readonly provider: string;
  readonly publishedAt: string | null;
  readonly daysObserved: number;
  readonly latestObservedOn: string | null;
  readonly metrics: ReelMetricSet;
};

export type ReelEvidence = {
  readonly sinceDays: number;
  readonly reels: readonly ReelEvidenceRow[];
  readonly byProvider: Readonly<Record<string, {
    readonly count: number;
    readonly measured: number;
    readonly sufficiency: ReelEvidenceSufficiency;
  }>>;
};

const EMPTY_METRICS: ReelMetricSet = {
  views: null, reach: null, engagement: null,
  avgWatchMs: null, totalWatchMs: null, replays: null,
};

/**
 * Folds one delivery's metric rows into the shared vocabulary.
 *
 * Metrics are lifetime counters, so the LATEST reading is the true one and
 * earlier days are superseded rather than summed. Summing them would multiply a
 * Reel's views by the number of times the collector ran.
 */
export function foldMetricsForProvider(
  provider: string,
  rows: readonly { metric: string; value: number; observedOn: string }[],
): { metrics: ReelMetricSet; daysObserved: number; latestObservedOn: string | null } {
  const days = new Set(rows.map((r) => r.observedOn));
  const latest = [...days].sort().pop() ?? null;
  const aliases = (METRIC_ALIASES as Record<string, Record<string, string>>)[provider] ?? {};

  const latestValueOf = (providerMetric: string | undefined): number | null => {
    if (!providerMetric) return null;
    const candidates = rows
      .filter((r) => r.metric === providerMetric)
      .sort((a, b) => a.observedOn.localeCompare(b.observedOn));
    const last = candidates[candidates.length - 1];
    return last ? last.value : null;
  };

  return {
    metrics: {
      views: latestValueOf(aliases.views),
      reach: latestValueOf(aliases.reach),
      engagement: latestValueOf(aliases.engagement),
      avgWatchMs: latestValueOf(aliases.avgWatchMs),
      totalWatchMs: latestValueOf(aliases.totalWatchMs),
      replays: latestValueOf(aliases.replays),
    },
    daysObserved: days.size,
    latestObservedOn: latest,
  };
}

/**
 * How much weight this provider's Reels can carry.
 *
 * "Measured" means past `MIN_VIEWS_FOR_COMPARISON`. A Reel with six views is
 * counted as published and excluded from ranking, because the alternative is a
 * confident sentence about a hook based on six people.
 */
export function sufficiencyFor(rows: readonly ReelEvidenceRow[]): ReelEvidenceSufficiency {
  const measured = rows.filter((r) => (r.metrics.views ?? 0) >= MIN_VIEWS_FOR_COMPARISON).length;
  if (measured < MIN_REELS_FOR_COMPARISON) return "insufficient";
  if (measured < MIN_REELS_FOR_PATTERN) return "directional";
  return "comparable";
}

export function summarizeByProvider(rows: readonly ReelEvidenceRow[]): ReelEvidence["byProvider"] {
  const out: Record<string, { count: number; measured: number; sufficiency: ReelEvidenceSufficiency }> = {};
  for (const provider of new Set(rows.map((r) => r.provider))) {
    const mine = rows.filter((r) => r.provider === provider);
    out[provider] = {
      count: mine.length,
      measured: mine.filter((r) => (r.metrics.views ?? 0) >= MIN_VIEWS_FOR_COMPARISON).length,
      sufficiency: sufficiencyFor(mine),
    };
  }
  return out;
}

const n = (v: number | null): string => (v === null ? "not reported" : String(Math.round(v)));
const secs = (ms: number | null): string => (ms === null ? "not reported" : `${(ms / 1000).toFixed(1)}s`);

/**
 * The block the strategist reads.
 *
 * Every sentence is either a number that was measured or an explicit statement
 * that it was not. There is no derived ranking, no "best performing", and no
 * cross-provider comparison — those are conclusions, and the whole point is
 * that the model draws them only where the sample supports it.
 */
export function formatReelEvidence(evidence: ReelEvidence): string {
  if (evidence.reels.length === 0) {
    return [
      `Organic Reel performance (last ${evidence.sinceDays} days): NO DATA.`,
      "No published Reel has collected numbers yet. Do not infer anything about hooks,",
      "stories or formats from this absence — say plainly that performance evidence is not in yet.",
    ].join("\n");
  }

  const lines: string[] = [
    `Organic Reel performance (last ${evidence.sinceDays} days) — measured, do not recompute:`,
    "",
  ];

  for (const [provider, s] of Object.entries(evidence.byProvider)) {
    lines.push(
      `${provider}: ${s.count} published, ${s.measured} past the ${MIN_VIEWS_FOR_COMPARISON}-view floor ` +
        `— evidence is ${s.sufficiency.toUpperCase()}`,
    );
  }
  lines.push("");

  for (const reel of evidence.reels) {
    lines.push(`- ${reel.story}  [${reel.provider}]  job ${reel.sourceJobId}`);
    lines.push(`    hook as published: "${reel.hook}"`);
    lines.push(
      `    views ${n(reel.metrics.views)} · reach ${n(reel.metrics.reach)} · ` +
        `engagement ${n(reel.metrics.engagement)}`,
    );
    if (reel.metrics.avgWatchMs !== null || reel.metrics.totalWatchMs !== null) {
      lines.push(
        `    avg watch ${secs(reel.metrics.avgWatchMs)} · total watch ${secs(reel.metrics.totalWatchMs)}`,
      );
    }
    lines.push(
      `    observed over ${reel.daysObserved} day(s), latest ${reel.latestObservedOn ?? "unknown"}` +
        (reel.publishedAt ? `, published ${reel.publishedAt.slice(0, 10)}` : ""),
    );
  }

  lines.push("");
  lines.push("How to use these numbers:");
  lines.push(
    `- Where a provider is INSUFFICIENT (fewer than ${MIN_REELS_FOR_COMPARISON} Reels past the view floor), ` +
      "report the numbers and state that there is not enough yet to conclude anything. Do not rank hooks.",
  );
  lines.push(
    "- Where it is DIRECTIONAL, you may note what a difference SUGGESTS, worded as a hypothesis to test next.",
  );
  lines.push(
    `- Only where it is COMPARABLE (${MIN_REELS_FOR_PATTERN}+) may you name a pattern as a finding.`,
  );
  if (!COMPARABLE_ACROSS_PROVIDERS) {
    lines.push(
      "- NEVER compare a Facebook number against an Instagram one. A Facebook play and an Instagram view " +
        "are counted differently, and Instagram reports no watch time at all — an absence there is a gap " +
        "in the API, not a Reel nobody watched.",
    );
  }
  lines.push(
    "- Each Reel names the render job that produced it. When you recommend repeating or dropping " +
      "an approach, cite the job id so the next plan can be traced to this evidence.",
  );

  return lines.join("\n");
}

/** The published caption's opening block — what a viewer actually read first. */
export function hookFromPostText(postText: string | null | undefined): string {
  const text = (postText ?? "").trim();
  if (!text) return "(no caption recorded)";
  const first = text.split(/\n\s*\n/)[0]?.trim() ?? text;
  return first.length > 200 ? `${first.slice(0, 197)}...` : first;
}

/** `"altair-overview — Facebook Reel"` -> `"altair-overview"`. */
export function storyFromTitle(title: string | null | undefined): string {
  const t = (title ?? "").trim();
  if (!t) return "(untitled)";
  return t.replace(/\s+[—-]\s+(Facebook|Instagram)\s+Reel\s*$/i, "").trim() || t;
}

export const EMPTY_REEL_METRICS = EMPTY_METRICS;
