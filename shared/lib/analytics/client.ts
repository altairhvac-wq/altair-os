/**
 * Browser side of first-party analytics. Call only from client components.
 *
 * Identity is a random id kept in localStorage (never a cookie, never sent to
 * a third party, never linked to a person until they choose to sign up). The
 * server stores only an HMAC of it. Visitors sending Global Privacy Control
 * or Do Not Track are not tracked at all, and anyone can opt a device out by
 * visiting any page with `?altair_analytics=off` (`=on` reverses it) — the
 * owner uses that on their own phones and laptops. Opting out also sends one
 * `exclude_device` beacon so that browser's EARLIER visits leave the figures
 * too. A browser the owner signs in on is marked the same way automatically:
 * the collect route answers `x-altair-analytics: internal` and the browser
 * stops sending. Automated browsers (navigator.webdriver) never send, and a
 * page Chrome prerenders is only counted if the person actually opens it.
 *
 * Attribution:
 *   - visit attribution (referrer + utm of the page that started this visit)
 *     is sent with every event, so internal navigation does not read as
 *     "internal" traffic;
 *   - first-touch attribution (the very first visit on this device) is kept
 *     for signup, so a person who watched a video last week and signs up today
 *     is still credited to the video.
 *
 * Visits and time (2026-11-24, migration 217):
 *   - a visit is shared by every tab of the browser and ends after 30 minutes
 *     with nothing happening (the usual definition). It used to be one per
 *     tab and never ended, so a second tab was a second, bounced visit;
 *   - a visit is "returning" when it is not the browser's first visit;
 *   - each page reports how long it was actually visible (`page_engaged`,
 *     when the tab is hidden, closed or left), so time on site includes the
 *     last page and one-page visits;
 *   - a pageview is sent when the PATH changes; calculators rewriting the
 *     query string are the same page.
 */
import {
  classifyChannel,
  isOwnHost,
  normalizeHost,
  readUtmParams,
  type AnalyticsAttribution,
} from "./attribution";
import { isValidEngagementLabel, type EngagementEventName } from "./engagement";

const VISITOR_KEY = "altair_vid_v1";
const FIRST_TOUCH_KEY = "altair_attr_v1";
/** The current visit: id, last activity, attribution (217). Replaces the per-tab altair_sid_v1. */
const VISIT_KEY = "altair_visit_v2";
/** The id of this browser's first visit (217): any other visit is a return. */
const FIRST_VISIT_KEY = "altair_first_visit_v1";
/** Set once the browser's very first pageview has been sent (the new-visitor limit only counts that one). */
const FIRST_PAGEVIEW_KEY = "altair_first_pv_v1";
/** Before 217 the first-seen date decided "returning"; its presence now marks a browser that has visited before. */
const LEGACY_FIRST_SEEN_KEY = "altair_first_seen_v1";
const VISIT_IDLE_MS = 30 * 60 * 1000;
/** One page_engaged report never carries more than 30 minutes (the database refuses more). */
const MAX_ENGAGED_MS = 30 * 60 * 1000;
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

/** Applies ?altair_analytics=off|on from the current URL. */
function applyOptOutParam(): void {
  const value = new URLSearchParams(window.location.search).get("altair_analytics");
  const local = storage("local");
  if (!local || !value) return;
  if (value === "off" && local.getItem(OPT_OUT_KEY) !== "1") {
    post("exclude_device", window.location.pathname);
    local.setItem(OPT_OUT_KEY, "1");
  }
  if (value === "on") local.removeItem(OPT_OUT_KEY);
}

export function isAnalyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  // Inside a frame this is an embedded calculator on someone else's website
  // (the only pages that can be framed). Their visitors are not ours to count:
  // no pageview, no "tool used", nothing stored.
  if (window.self !== window.top) return false;
  applyOptOutParam();
  if (navigator.webdriver === true) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true) return false;
  if (nav.doNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1") return false;
  return storage("local")?.getItem(OPT_OUT_KEY) !== "1";
}

/** Ids kept for this page load when the browser refuses storage, so one view is not many visitors. */
let memoryVisitorId: string | null = null;
let memoryVisit: Visit | null = null;

function visitorId(): string {
  const local = storage("local");
  if (!local) return (memoryVisitorId ??= randomId());
  let id = local.getItem(VISITOR_KEY);
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    id = randomId();
    local.setItem(VISITOR_KEY, id);
  } else if (local.getItem(LEGACY_FIRST_SEEN_KEY)) {
    // A browser from before 217: it has been here already, so its next visit
    // is a return and its next pageview is not a first one.
    if (!local.getItem(FIRST_VISIT_KEY)) local.setItem(FIRST_VISIT_KEY, "before-217");
    if (!local.getItem(FIRST_PAGEVIEW_KEY)) local.setItem(FIRST_PAGEVIEW_KEY, "1");
    local.removeItem(LEGACY_FIRST_SEEN_KEY);
  }
  return id;
}

type Visit = { id: string; last: number; attr: SessionAttribution };

/**
 * The visit this event belongs to: the stored one if something happened in
 * the last 30 minutes (in any tab), otherwise a new one whose attribution is
 * this page's referrer and utm tags. Every call counts as activity.
 */
function currentVisit(): Visit {
  const local = storage("local");
  const now = Date.now();
  let visit: Visit | null = memoryVisit;
  if (local) {
    try {
      const stored = JSON.parse(local.getItem(VISIT_KEY) ?? "null") as Visit | null;
      visit = stored && typeof stored.id === "string" && typeof stored.last === "number" ? stored : null;
    } catch {
      visit = null;
    }
  }
  if (!visit || !/^[A-Za-z0-9_-]{16,64}$/.test(visit.id) || now - visit.last > VISIT_IDLE_MS || visit.last > now + 60_000) {
    visit = { id: randomId(), last: now, attr: { ...readUtmParams(window.location.search), referrerHost: currentReferrerHost() } };
    if (local && !local.getItem(FIRST_VISIT_KEY)) local.setItem(FIRST_VISIT_KEY, visit.id);
  } else {
    visit = { ...visit, last: now };
  }
  memoryVisit = visit;
  try {
    local?.setItem(VISIT_KEY, JSON.stringify(visit));
  } catch {
    // Storage full or blocked: the in-memory visit still holds for this page.
  }
  return visit;
}

/** null when the browser keeps no storage (we cannot know). */
function isReturningVisit(visit: Visit): boolean | null {
  const first = storage("local")?.getItem(FIRST_VISIT_KEY);
  if (!first) return null;
  return first !== visit.id;
}

function currentReferrerHost(): string | null {
  const host = normalizeHost(document.referrer || null);
  return host && !isOwnHost(host) ? host : null;
}

/** Visit attribution: the referrer and utm tags of the page that started this visit. */
function sessionAttribution(): SessionAttribution {
  return currentVisit().attr;
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

type ClientEvent = "pageview" | "page_engaged" | "signup_started" | "exclude_device" | EngagementEventName;

function send(event: "pageview" | "signup_started", path: string): void {
  post(event, path);
}

function post(event: ClientEvent, path: string, label?: string, extra: { engagedMs?: number } = {}): void {
  const visit = currentVisit();
  const attribution = visit.attr;
  // The browser's very first pageview, once: only that one counts against the
  // per-address new-visitor limit on the server.
  let firstVisit = false;
  if (event === "pageview") {
    const local = storage("local");
    if (local && !local.getItem(FIRST_PAGEVIEW_KEY)) {
      local.setItem(FIRST_PAGEVIEW_KEY, "1");
      firstVisit = true;
    }
  }
  const body = JSON.stringify({
    event,
    path,
    ...(label ? { label } : {}),
    ...(extra.engagedMs ? { engagedMs: extra.engagedMs } : {}),
    ...(firstVisit ? { firstVisit: true } : {}),
    eventId: randomId(),
    visitorId: visitorId(),
    sessionId: visit.id,
    isReturning: isReturningVisit(visit),
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
    })
      .then((response) => {
        // The server recognised this browser as the owner's: stop for good.
        if (response.headers.get("x-altair-analytics") === "internal") {
          storage("local")?.setItem(OPT_OUT_KEY, "1");
        }
      })
      .catch(() => undefined);
  } catch {
    // Analytics must never affect the page.
  }
}

// ---------------------------------------------------------------- visible time (217)
let engagedPath: string | null = null;
let engagedMs = 0;
let visibleSince: number | null = null;
let engagedListening = false;

/** Adds the time since the page last became visible to the running total. */
function pauseEngaged(): void {
  if (visibleSince !== null) {
    engagedMs += Date.now() - visibleSince;
    visibleSince = null;
  }
}

/**
 * Sends the visible time collected for the current page (under a second is
 * not worth a request) and starts the count again from zero.
 */
function flushEngaged(): void {
  pauseEngaged();
  const ms = Math.min(Math.round(engagedMs), MAX_ENGAGED_MS);
  engagedMs = 0;
  if (engagedPath && ms >= 1000 && isAnalyticsAllowed()) post("page_engaged", engagedPath, undefined, { engagedMs: ms });
}

function listenForEngagement(): void {
  if (engagedListening) return;
  engagedListening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEngaged();
    else if (engagedPath) visibleSince = Date.now();
  });
  // Closing the tab or leaving the site: report what is left (keepalive fetch survives the unload).
  window.addEventListener("pagehide", () => flushEngaged());
}

/**
 * Records a pageview when the path changes. Query-string changes on the same
 * page (calculator presets, share links) are not new pages, and the same path
 * twice in a row (a re-render) is one view.
 */
export function trackPageview(pathname: string): void {
  const doc = document as Document & { prerendering?: boolean };
  if (doc.prerendering) {
    doc.addEventListener("prerenderingchange", () => trackPageview(pathname), { once: true });
    return;
  }
  if (!isAnalyticsAllowed()) return;
  firstTouch();
  const now = Date.now();
  if (pathname === lastPageviewKey) return;
  // The page being left reports its visible time before the next one starts.
  flushEngaged();
  lastPageviewKey = pathname;
  send("pageview", pathname);
  listenForEngagement();
  engagedPath = pathname;
  engagedMs = 0;
  visibleSince = document.visibilityState === "visible" ? now : null;
}

const engagementSent = new Set<string>();

/**
 * Records one deliberate action: a video played, a trial button pressed, a
 * calculator used, a template downloaded (migration 209).
 *
 * `label` says WHICH one and must be a slug our own code chose. Nothing the
 * visitor typed is ever passed here. Each event + label is sent at most once
 * per page view, so holding a key down or replaying a video cannot inflate a
 * count; `repeat` lifts that for actions where every press matters.
 */
export function trackEngagement(
  event: EngagementEventName,
  label: string,
  options: { repeat?: boolean } = {},
): void {
  if (typeof window === "undefined" || !isValidEngagementLabel(label)) return;
  if (!isAnalyticsAllowed()) return;
  const path = window.location.pathname;
  const key = `${event}:${label}:${path}`;
  if (!options.repeat) {
    if (engagementSent.has(key)) return;
    engagementSent.add(key);
  }
  post(event, path, label);
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
    visitorId: visitorId(),
    sessionId: currentVisit().id,
    attribution: touch ? JSON.stringify(touch) : "",
  };
}
