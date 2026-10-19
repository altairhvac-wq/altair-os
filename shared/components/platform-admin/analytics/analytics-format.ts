import type { MetricValue } from "@/shared/lib/analytics/platform-metrics";

/** Formatting for the Platform analytics page. "—" always means "not measurable". */

export const DASH = "—";

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  return value.toLocaleString("en-US");
}

export function formatPercent(fraction: number | null | undefined, digits = 0): string {
  if (fraction == null || !Number.isFinite(fraction)) return DASH;
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return DASH;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function metricText(metric: MetricValue, format: (value: number) => string = formatCount): string {
  return metric.state === "value" ? format(metric.value) : DASH;
}

/** "+12%" / "−4%" vs the previous period, or null when there is nothing to compare. */
export function deltaText(current: number, previous: number): { text: string; tone: "up" | "down" | "flat" } | null {
  if (previous <= 0) return current > 0 ? { text: "new", tone: "up" } : null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return { text: "no change", tone: "flat" };
  const pct = Math.round(Math.abs(change) * 100);
  return change > 0 ? { text: `+${pct}%`, tone: "up" } : { text: `−${pct}%`, tone: "down" };
}

export function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Direct",
  search: "Search",
  social: "Social",
  email: "Email",
  paid: "Paid ads",
  referral: "Referral",
  internal: "Internal",
  unknown: "Unknown / before tracking",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

export function deviceLabel(device: string): string {
  return DEVICE_LABELS[device] ?? device;
}
