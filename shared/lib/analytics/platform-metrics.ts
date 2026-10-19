/**
 * Pure metric rules for the Platform analytics page.
 *
 * Kept free of Next.js and database imports so scripts/verify-platform-analytics.mjs
 * exercises the shipped functions directly.
 *
 * ============ UNKNOWN IS NOT ZERO ============
 * A metric whose source does not exist yet (traffic before migration 202 is
 * applied, MRR with no Stripe price on record) is `unavailable` with a reason,
 * never 0. A rate with a zero denominator is null ("—"), never 0%.
 */

export type MetricValue =
  | { state: "value"; value: number }
  | { state: "unavailable"; reason: string };

export function metricValue(value: number): MetricValue {
  return { state: "value", value };
}

export function metricUnavailable(reason: string): MetricValue {
  return { state: "unavailable", reason };
}

/** numerator / denominator as a fraction, or null when the denominator is 0 or unknown. */
export function rate(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (numerator == null || denominator == null) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export type AnalyticsRangeKey = "7d" | "30d" | "90d" | "365d";

export const ANALYTICS_RANGES: { key: AnalyticsRangeKey; label: string; days: number }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "365d", label: "Last 12 months", days: 365 },
];

export function resolveAnalyticsRange(
  key: string | null | undefined,
  nowMs: number,
): { key: AnalyticsRangeKey; label: string; days: number; fromIso: string; toIso: string; previousFromIso: string } {
  const found = ANALYTICS_RANGES.find((range) => range.key === key) ?? ANALYTICS_RANGES[1];
  const toMs = nowMs;
  const fromMs = toMs - found.days * 86_400_000;
  return {
    ...found,
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
    previousFromIso: new Date(fromMs - found.days * 86_400_000).toISOString(),
  };
}

/**
 * Monthly recurring amount, in cents, of one Stripe subscription item list.
 * Normalises every interval to a month (annual / 12, weekly × 52 / 12, …)
 * and multiplies by quantity. Items without a usable price contribute nothing
 * and are reported so the caller can mark the total as partial.
 */
export function monthlyAmountFromStripeItems(items: unknown): { cents: number; unpriced: number } {
  const list = Array.isArray(items)
    ? items
    : items && typeof items === "object" && Array.isArray((items as { data?: unknown }).data)
      ? ((items as { data: unknown[] }).data)
      : [];
  let cents = 0;
  let unpriced = 0;
  for (const raw of list) {
    const item = raw as {
      quantity?: number;
      price?: { unit_amount?: number | null; recurring?: { interval?: string; interval_count?: number } | null };
      plan?: { amount?: number | null; interval?: string; interval_count?: number };
    };
    const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
    const unit = item.price?.unit_amount ?? item.plan?.amount ?? null;
    const interval = item.price?.recurring?.interval ?? item.plan?.interval ?? null;
    const count = item.price?.recurring?.interval_count ?? item.plan?.interval_count ?? 1;
    if (typeof unit !== "number" || !interval || !(count > 0)) {
      unpriced += 1;
      continue;
    }
    const perMonth =
      interval === "month"
        ? unit / count
        : interval === "year"
          ? unit / (12 * count)
          : interval === "week"
            ? (unit * 52) / (12 * count)
            : interval === "day"
              ? (unit * 365) / (12 * count)
              : null;
    if (perMonth == null) {
      unpriced += 1;
      continue;
    }
    cents += perMonth * quantity;
  }
  return { cents: Math.round(cents), unpriced };
}

export type FunnelStepInput = {
  key: string;
  label: string;
  /** null = not measured (no data source yet). */
  count: number | null;
  source: string;
};

export type FunnelStep = FunnelStepInput & {
  /** Fraction of the previous measured step, or null. */
  fromPrevious: number | null;
  /** Fraction of the first step, or null. */
  fromFirst: number | null;
};

export function buildFunnel(steps: FunnelStepInput[]): {
  steps: FunnelStep[];
  bottleneck: FunnelStep | null;
} {
  const first = steps.find((step) => step.count != null)?.count ?? null;
  let previous: number | null = null;
  const built: FunnelStep[] = steps.map((step) => {
    const fromPrevious = step.count == null ? null : rate(step.count, previous);
    const fromFirst = step.count == null ? null : rate(step.count, first);
    if (step.count != null) previous = step.count;
    return { ...step, fromPrevious, fromFirst };
  });
  // The bottleneck is the measured transition that loses the largest share,
  // ignoring transitions from a step of fewer than 3 people (noise).
  let bottleneck: FunnelStep | null = null;
  let worst = Infinity;
  let previousCount: number | null = null;
  for (const step of built) {
    if (step.count == null) continue;
    if (previousCount != null && previousCount >= 3 && step.fromPrevious != null && step.fromPrevious < worst) {
      worst = step.fromPrevious;
      bottleneck = step;
    }
    previousCount = step.count;
  }
  return { steps: built, bottleneck };
}

/** Subscriptions canceled in the period divided by paying subscriptions at its start. */
export function churnRate(canceledInPeriod: number, payingAtStart: number): number | null {
  return rate(canceledInPeriod, payingAtStart);
}

/** Percentage change, or null when there is no previous value to compare. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous == null || previous <= 0) return null;
  return (current - previous) / previous;
}

/** UTC day keys "YYYY-MM-DD" from fromIso (inclusive) to toIso (inclusive of its day). */
export function utcDayKeys(fromIso: string, toIso: string): string[] {
  const keys: string[] = [];
  const start = new Date(fromIso);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(toIso);
  for (let d = start.getTime(); d <= end.getTime(); d += 86_400_000) {
    keys.push(new Date(d).toISOString().slice(0, 10));
  }
  return keys;
}

/** Counts timestamps per UTC day across the given keys (missing days = 0). */
export function countByUtcDay(timestamps: (string | null)[], dayKeys: string[]): { day: string; value: number }[] {
  const counts = new Map(dayKeys.map((key) => [key, 0]));
  for (const stamp of timestamps) {
    if (!stamp) continue;
    const key = stamp.slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return dayKeys.map((day) => ({ day, value: counts.get(day) ?? 0 }));
}
