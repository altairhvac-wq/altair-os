/**
 * First-party analytics: pure classification and sanitising rules.
 *
 * Shared by the browser tracker, the /api/analytics/collect route, the signup
 * action and the verifier, so one set of rules decides what a "social" visit
 * is and what may be stored. No Next.js or server-only imports.
 *
 * Privacy rules enforced here (see migration 202):
 *   - paths lose their query string and fragment; token-bearing pages are
 *     reduced to their prefix, so approval/payment tokens never leave the
 *     browser in an analytics beacon;
 *   - referrers are reduced to a host;
 *   - UTM values are trimmed, lower-cased (source/medium) and length-capped.
 */

export type AnalyticsChannel =
  | "direct"
  | "search"
  | "social"
  | "email"
  | "paid"
  | "referral"
  | "internal"
  | "unknown";

export type AnalyticsDevice = "mobile" | "tablet" | "desktop" | "unknown";

export type AnalyticsAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrerHost: string | null;
  landingPath: string | null;
  firstSeenAt: string | null;
};

/** The public hosts of the product: a referrer from one of these is internal. */
export const ANALYTICS_OWN_HOSTS = [
  "altair-op.com",
  "www.altair-op.com",
  "app.altair-op.com",
] as const;

/** Paths whose segments after the prefix are secrets (tokens) or ids. */
const TOKEN_PATH_PREFIXES = [
  "/estimate-approval",
  "/invoice-payment",
  "/auth/callback",
  "/reset-password",
] as const;

const SOCIAL_HOSTS = [
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.com",
  "fb.me",
  "messenger.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "t.co",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "pinterest.com",
  "threads.net",
  "nextdoor.com",
  "snapchat.com",
] as const;

const SEARCH_HOSTS = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "yahoo.com",
  "ecosia.org",
  "search.brave.com",
  "yandex.",
  "baidu.com",
  "startpage.com",
] as const;

const EMAIL_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "mail.yahoo.com",
  "mail.proton.me",
] as const;

const SOCIAL_SOURCES = new Set([
  "youtube",
  "yt",
  "facebook",
  "fb",
  "instagram",
  "ig",
  "tiktok",
  "tt",
  "twitter",
  "x",
  "linkedin",
  "reddit",
  "pinterest",
  "threads",
  "nextdoor",
  "snapchat",
]);

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "paid_social", "paidsocial", "display", "cpm", "ads", "ad"]);
const EMAIL_MEDIUMS = new Set(["email", "e-mail", "newsletter"]);
const SOCIAL_MEDIUMS = new Set(["social", "social_media", "organic_social", "video", "shorts", "reel", "reels", "story"]);

function clip(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Lower-cased host without a leading "www.", or null when unparseable. */
export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const raw = value.includes("://") ? value : `https://${value}`;
    const host = new URL(raw).hostname.toLowerCase();
    if (!host || host.length > 255 || !host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

function hostMatches(host: string, needle: string): boolean {
  const bare = host.replace(/^www\./, "").replace(/^m\./, "").replace(/^l\./, "").replace(/^lm\./, "");
  if (needle.endsWith(".")) return bare.startsWith(needle) || bare.includes(`.${needle}`);
  return bare === needle || bare.endsWith(`.${needle}`);
}

export function isOwnHost(host: string | null): boolean {
  if (!host) return false;
  return ANALYTICS_OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`));
}

/**
 * The channel a visit came from. UTM tags win over the referrer because a
 * tagged link is the owner telling us what the link was for; the referrer is
 * the fallback for untagged traffic.
 */
export function classifyChannel(input: {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
}): AnalyticsChannel {
  const source = input.utmSource?.toLowerCase() ?? null;
  const medium = input.utmMedium?.toLowerCase() ?? null;

  if (medium && PAID_MEDIUMS.has(medium)) return "paid";
  if (medium && EMAIL_MEDIUMS.has(medium)) return "email";
  if (medium && SOCIAL_MEDIUMS.has(medium)) return "social";
  if (source && SOCIAL_SOURCES.has(source)) return "social";
  if (source === "google" && medium === "organic") return "search";
  if (source === "email" || source === "newsletter") return "email";

  const host = input.referrerHost;
  if (!host) return source ? "referral" : "direct";
  if (isOwnHost(host)) return source ? "referral" : "internal";
  if (EMAIL_HOSTS.some((needle) => hostMatches(host, needle))) return "email";
  if (SOCIAL_HOSTS.some((needle) => hostMatches(host, needle))) return "social";
  if (SEARCH_HOSTS.some((needle) => hostMatches(host, needle))) return "search";
  return "referral";
}

/**
 * A path safe to store: no query, no fragment, token pages reduced to their
 * prefix, other long ids kept (product pages like /jobs/<uuid> are fine — the
 * id is the tenant's record id, never a secret) but capped in length.
 */
export function sanitizePath(rawPath: string | null | undefined): string {
  if (typeof rawPath !== "string" || !rawPath.startsWith("/")) return "/";
  const path = rawPath.split(/[?#]/)[0] || "/";
  for (const prefix of TOKEN_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return prefix;
  }
  // Collapse record ids so product pages aggregate as one area per screen.
  const collapsed = path
    .split("/")
    .map((segment) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^\d{3,}$/.test(segment)
        ? "[id]"
        : segment,
    )
    .join("/");
  return collapsed.slice(0, 512) || "/";
}

/** Coarse device class from a user agent. The UA itself is never stored. */
export function deviceFromUserAgent(userAgent: string | null | undefined): AnalyticsDevice {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros|x11/.test(ua)) return "desktop";
  return "unknown";
}

/** Crawlers, link unfurlers, monitors and headless browsers. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|facebookexternalhit|facebot|embedly|preview|unfurl|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|postman|vercel-screenshot|playwright|puppeteer/i.test(
    userAgent,
  );
}

const UTM_LIMITS = { source: 100, medium: 100, campaign: 150, content: 150, term: 150 } as const;

/** Reads utm_* from a URL search string. */
export function readUtmParams(search: string | null | undefined): Pick<
  AnalyticsAttribution,
  "source" | "medium" | "campaign" | "content" | "term"
> {
  const params = new URLSearchParams(search ?? "");
  return {
    source: clip(params.get("utm_source"), UTM_LIMITS.source)?.toLowerCase() ?? null,
    medium: clip(params.get("utm_medium"), UTM_LIMITS.medium)?.toLowerCase() ?? null,
    campaign: clip(params.get("utm_campaign"), UTM_LIMITS.campaign),
    content: clip(params.get("utm_content"), UTM_LIMITS.content),
    term: clip(params.get("utm_term"), UTM_LIMITS.term),
  };
}

/**
 * Validates an attribution object that came from the browser (or user
 * metadata). Anything malformed becomes null fields rather than an error:
 * attribution is best-effort and must never block a signup.
 */
export function sanitizeAttribution(value: unknown): AnalyticsAttribution | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" ? (v[key] as string) : null);
  const firstSeen = str("firstSeenAt");
  const firstSeenMs = firstSeen ? Date.parse(firstSeen) : Number.NaN;
  const attribution: AnalyticsAttribution = {
    source: clip(str("source"), UTM_LIMITS.source)?.toLowerCase() ?? null,
    medium: clip(str("medium"), UTM_LIMITS.medium)?.toLowerCase() ?? null,
    campaign: clip(str("campaign"), UTM_LIMITS.campaign),
    content: clip(str("content"), UTM_LIMITS.content),
    term: clip(str("term"), UTM_LIMITS.term),
    referrerHost: normalizeHost(str("referrerHost")),
    landingPath: str("landingPath") ? sanitizePath(str("landingPath")) : null,
    firstSeenAt: Number.isFinite(firstSeenMs) ? new Date(firstSeenMs).toISOString() : null,
  };
  const hasAnything = Object.values(attribution).some((field) => field !== null);
  return hasAnything ? attribution : null;
}

export function parseAttributionJson(raw: string | null | undefined): AnalyticsAttribution | null {
  if (!raw || raw.length > 2000) return null;
  try {
    return sanitizeAttribution(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Random-looking client ids: 16–64 url-safe characters. */
export function isValidClientId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

/** Top-level product area for feature-usage counts: "/jobs/[id]" → "jobs". */
export function featureAreaFromPath(path: string): string {
  const first = path.split("/")[1] ?? "";
  return first || "home";
}
