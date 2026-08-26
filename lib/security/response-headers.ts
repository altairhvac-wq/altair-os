/**
 * Production HTTP security headers.
 *
 * ==================== WHAT WAS MISSING ====================
 * The application shipped with no security response headers at all: no CSP, no
 * clickjacking protection, no HSTS, no nosniff, no referrer policy. The two
 * pages a customer's customer sees — public estimate approval and public
 * invoice payment, one of which leads to a card form — were equally
 * unprotected against being framed by a third party.
 *
 * ==================== BUILT FROM WHAT THE APP ACTUALLY LOADS ====================
 * A copy-pasted CSP that breaks Checkout is worse than none, because it will
 * be removed in a hurry and never come back. Every directive below is derived
 * from a real dependency in this codebase:
 *
 *   next/font/google        Fonts are self-hosted at build time. No external
 *                           font host is needed, so font-src stays 'self'.
 *   Meta Pixel              An inline bootstrap script that loads
 *                           connect.facebook.net, plus a www.facebook.com
 *                           tracking pixel image.
 *   mapbox-gl               Creates Workers from blob: URLs, fetches tiles and
 *                           geocoding from api.mapbox.com, and reports to
 *                           events.mapbox.com.
 *   Supabase                REST and Realtime — https and wss to the project
 *                           host; signed Storage URLs serve receipt and
 *                           attachment images from the same host.
 *   Stripe                  Checkout is a full-page REDIRECT, not an embed.
 *                           Nothing loads js.stripe.com and nothing frames
 *                           Stripe, so no allowance is required.
 *
 * ==================== THE KNOWN LIMITATION ====================
 * script-src includes 'unsafe-inline'. Next.js emits inline bootstrap and
 * Flight-payload scripts, and the Meta Pixel bootstrap is inline, so a strict
 * policy needs per-request nonces threaded through middleware. That is a
 * larger change than this hardening pass should make, and it is documented
 * rather than hidden.
 *
 * This is still worth shipping now. The directives that do NOT depend on
 * script-src are the ones that close the audit findings:
 *   frame-ancestors 'none'  no third party can frame the payment page
 *   object-src 'none'       no plugin content
 *   base-uri 'self'         an injected <base> cannot re-point relative URLs
 *   form-action             a form cannot be made to POST to an attacker
 * plus HSTS, nosniff, referrer policy and a restrictive permissions policy.
 *
 * UPGRADE PATH: emit a nonce in middleware, add it to script-src, drop
 * 'unsafe-inline', and move the Meta Pixel bootstrap onto the nonce.
 */

export type SecurityHeader = { key: string; value: string };

/** Hosts the Meta Pixel needs when NEXT_PUBLIC_META_PIXEL_ID is configured. */
const META_PIXEL_SCRIPT_HOST = "https://connect.facebook.net";
const META_PIXEL_IMAGE_HOST = "https://www.facebook.com";

/** Mapbox GL JS tile, style, geocoding and telemetry hosts. */
const MAPBOX_HOSTS = ["https://api.mapbox.com", "https://events.mapbox.com"];

function originOf(rawUrl: string | undefined): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * Builds the Content-Security-Policy value.
 *
 * `isDevelopment` adds 'unsafe-eval' and the dev websocket, both of which the
 * Next.js dev server requires and neither of which should ever be present in a
 * production response.
 */
export function buildContentSecurityPolicy(options: {
  supabaseUrl?: string;
  isDevelopment: boolean;
}): string {
  const supabaseOrigin = originOf(options.supabaseUrl);
  const supabaseWs = supabaseOrigin
    ? supabaseOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:")
    : null;

  const scriptSrc = [
    "'self'",
    // See "THE KNOWN LIMITATION" above.
    "'unsafe-inline'",
    META_PIXEL_SCRIPT_HOST,
    ...(options.isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  const connectSrc = [
    "'self'",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    ...(supabaseWs ? [supabaseWs] : []),
    ...MAPBOX_HOSTS,
    META_PIXEL_IMAGE_HOST,
    ...(options.isDevelopment ? ["ws:", "http://localhost:*"] : []),
  ];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    "https://api.mapbox.com",
    META_PIXEL_IMAGE_HOST,
  ];

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSrc],
    // Tailwind and mapbox-gl both inject style elements at runtime.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", imgSrc],
    // Fonts are self-hosted by next/font. data: covers inlined subsets.
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connectSrc],
    // mapbox-gl instantiates its worker from a blob: URL.
    ["worker-src", ["'self'", "blob:"]],
    ["child-src", ["'self'", "blob:"]],
    // Signed Storage URLs serve receipt PDFs and marketing video.
    ["media-src", ["'self'", "blob:", ...(supabaseOrigin ? [supabaseOrigin] : [])]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    // The clickjacking control. Nothing in this application is meant to be
    // embedded, least of all the public invoice payment page.
    ["frame-ancestors", ["'none'"]],
    ["frame-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["upgrade-insecure-requests", []],
  ];

  return directives
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/**
 * The full header set applied to every response.
 *
 * HSTS is omitted outside production on purpose: pinning HTTPS for localhost
 * makes local development over http impossible and is remembered by the
 * browser long after the header is removed.
 */
export function buildSecurityHeaders(options: {
  supabaseUrl?: string;
  isDevelopment: boolean;
}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    // Redundant with frame-ancestors for modern browsers; retained for older
    // ones that honour only this.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Send the origin cross-site, the full path same-origin. A public
    // estimate-approval URL contains a bearer-equivalent token in its path, so
    // a full-URL referrer would leak it to any host the page links out to.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      // Geolocation is allowed for the technician dispatch map; the rest are
      // capabilities this application never uses.
      value: [
        "accelerometer=()",
        "autoplay=()",
        "camera=()",
        "display-capture=()",
        "encrypted-media=()",
        "geolocation=(self)",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
        "xr-spatial-tracking=()",
      ].join(", "),
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (!options.isDevelopment) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
