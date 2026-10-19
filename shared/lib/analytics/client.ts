/**
 * Browser side of first-party analytics. Call only from client components.
 *
 * Identity is a random id kept in localStorage (never a cookie, never sent to
 * a third party, never linked to a person until they choose to sign up). The
 * server stores only an HMAC of it. Visitors sending Global Privacy Control
 * or Do Not Track are not tracked at all, and anyone can opt a device out by
 * visiting any page with `?altair_analytics=off` (`=on` reverses it) — the
 * owner uses that on their own phones and laptops.
 *
 * Attribution:
 *   - session attribution (referrer + utm of the page that started this tab
 *     session) is sent with every event, so internal navigation does not read
 *     as "internal" traffic;
 *   - first-touch attribution (the very first visit on this device) is kept
 *     for signup, so a person who watched a video last week and signs up today
 *     is still credited to the video.
 */
import {
  classifyChannel,
  isOwnHost,
  normalizeHost,
  readUtmParams,
  type AnalyticsAttribution,
} from "./attribution";

const VISITOR_KEY = "altair_vid_v1";
const FIRST_SEEN_KEY = "altair_first_seen_v1";
const FIRST_TOUCH_KEY = "altair_attr_v1";
const SESSION_KEY = "altair_sid_v1";
const SESSION_ATTR_KEY = "altair_sattr_v1";
const OPT_OUT_KEY = "altair_analytics_optout";
const COLLECT_URL = "/api/analytics/collect";

type SessionAttribution = Pick<
  AnalyticsAttribution,
  "source" | "medium" | "campaign" | "content" | "term" | "referrerHost"
>;

function storage(kind: "local" | "session"): Storage | null {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = "__altair_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function randomId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Applies ?altair_analytics=off|on from the current URL. */
function applyOptOutParam(): void {
  const value = new URLSearchParams(window.location.search).get("altair_analytics");
  const local = storage("local");
  if (!local || !value) return;
  if (value === "off") local.setItem(OPT_OUT_KEY, "1");
  if (value === "on") local.removeItem(OPT_OUT_KEY);
}

export function isAnalyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  applyOptOutParam();
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true) return false;
  if (nav.doNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1") return false;
  return storage("local")?.getItem(OPT_OUT_KEY) !== "1";
}

function visitor(): { visitorId: string; isReturning: boolean | null } {
  const local = storage("local");
  if (!local) return { visitorId: randomId(), isReturning: null };
  let id = local.getItem(VISITOR_KEY);
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    id = randomId();
    local.setItem(VISITOR_KEY, id);
  }
  const firstSeen = local.getItem(FIRST_SEEN_KEY);
  if (!firstSeen) {
    local.setItem(FIRST_SEEN_KEY, todayUtc());
    return { visitorId: id, isReturning: false };
  }
  return { visitorId: id, isReturning: firstSeen < todayUtc() };
}

function sessionId(): string {
  const session = storage("session");
  if (!session) return randomId();
  let id = session.getItem(SESSION_KEY);
  if (!id) {
    id = randomId();
    session.setItem(SESSION_KEY, id);
  }
  return id;
}

function currentReferrerHost(): string | null {
  const host = normalizeHost(document.referrer || null);
  return host && !isOwnHost(host) ? host : null;
}

/** Session attribution, captured once per tab session from its landing page. */
function sessionAttribution(): SessionAttribution {
  const session = storage("session");
  const stored = session?.getItem(SESSION_ATTR_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as SessionAttribution;
    } catch {
      // fall through and recapture
    }
  }
  const utm = readUtmParams(window.location.search);
  const attribution: SessionAttribution = { ...utm, referrerHost: currentReferrerHost() };
  session?.setItem(SESSION_ATTR_KEY, JSON.stringify(attribution));
  return attribution;
}

/** First-touch attribution, captured on the first visit ever from this browser. */
function firstTouch(): AnalyticsAttribution | null {
  const local = storage("local");
  if (!local) return null;
  const stored = local.getItem(FIRST_TOUCH_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as AnalyticsAttribution;
    } catch {
      // recapture below
    }
  }
  const session = sessionAttribution();
  const attribution: AnalyticsAttribution = {
    ...session,
    landingPath: window.location.pathname,
    firstSeenAt: new Date().toISOString(),
  };
  local.setItem(FIRST_TOUCH_KEY, JSON.stringify(attribution));
  return attribution;
}

let lastPageviewKey: string | null = null;
let lastPageviewAt = 0;

function send(event: "pageview" | "signup_started", path: string): void {
  const { visitorId, isReturning } = visitor();
  const attribution = sessionAttribution();
  const body = JSON.stringify({
    event,
    path,
    eventId: randomId(),
    visitorId,
    sessionId: sessionId(),
    isReturning,
    referrerHost: attribution.referrerHost,
    utmSource: attribution.source,
    utmMedium: attribution.medium,
    utmCampaign: attribution.campaign,
    utmContent: attribution.content,
    utmTerm: attribution.term,
    channel: classifyChannel({
      referrerHost: attribution.referrerHost,
      utmSource: attribution.source,
      utmMedium: attribution.medium,
    }),
  });
  try {
    void fetch(COLLECT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never affect the page.
  }
}

/** Records a pageview. Repeated calls for the same URL within 2s are ignored. */
export function trackPageview(pathname: string, search: string): void {
  if (!isAnalyticsAllowed()) return;
  firstTouch();
  const key = `${pathname}?${search}`;
  const now = Date.now();
  if (key === lastPageviewKey && now - lastPageviewAt < 2000) return;
  lastPageviewKey = key;
  lastPageviewAt = now;
  send("pageview", pathname);
}

let signupStartedSent = false;

/** Records that the visitor began filling in the signup form (once per page). */
export function trackSignupStarted(): void {
  if (signupStartedSent || !isAnalyticsAllowed()) return;
  signupStartedSent = true;
  send("signup_started", window.location.pathname);
}

/**
 * Values the signup form posts as hidden fields, so the server can record the
 * completed signup against the same visitor and credit the right campaign.
 * Empty when tracking is not allowed.
 */
export function signupAnalyticsFields(): {
  visitorId: string;
  sessionId: string;
  attribution: string;
} {
  if (!isAnalyticsAllowed()) return { visitorId: "", sessionId: "", attribution: "" };
  const touch = firstTouch();
  return {
    visitorId: visitor().visitorId,
    sessionId: sessionId(),
    attribution: touch ? JSON.stringify(touch) : "",
  };
}
