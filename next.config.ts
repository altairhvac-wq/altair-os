import os from "os";
import type { NextConfig } from "next";
// Relative import on purpose: next.config.ts is evaluated by the config loader
// before the tsconfig path alias is available.
import { buildSecurityHeaders } from "./lib/security/response-headers";

function getLocalDevOrigins(): string[] {
  const origins = new Set<string>();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        origins.add(net.address);
      }
    }
  }

  for (const origin of process.env.DEV_ALLOWED_ORIGINS?.split(",") ?? []) {
    const trimmed = origin.trim();
    if (trimmed) {
      origins.add(trimmed);
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
  // Dev-only capture affordance for the Altair Demo Tool: the development
  // indicator badge ("Compiling…", the N overlay) would otherwise be filmed
  // into product videos. Off only when the capture server asks for it.
  ...(process.env.DEMO_TOOL_HIDE_DEV_INDICATOR?.trim() === "1"
    ? { devIndicators: false as const }
    : {}),
  // Nothing gains from announcing the framework and version to a scanner.
  poweredByHeader: false,
  images: {
    qualities: [70, 75, 90],
    // Marketing screenshots change a few times a year, not a few times a
    // day: keep optimized variants for a day instead of the 4-hour default.
    minimumCacheTTL: 86400,
  },
  /**
   * Security headers on every response.
   *
   * Applied at the config layer rather than in middleware so they also cover
   * responses middleware does not see, and so a matcher change cannot silently
   * drop them. The policy is derived from what the application actually loads;
   * see lib/security/response-headers.ts for each directive's justification.
   */
  async headers() {
    const securityHeaders = buildSecurityHeaders({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      isDevelopment: process.env.NODE_ENV !== "production",
    });
    // Files under /public ship with `max-age=0, must-revalidate`, so every
    // repeat visit re-checks each screenshot, icon and the link-preview
    // image. A day in the browser (a week stale-while-revalidate) is safe:
    // a recaptured screenshot keeps its name and shows within a day.
    const marketingAssetCache = {
      key: "Cache-Control",
      value: "public, max-age=86400, stale-while-revalidate=604800",
    };
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/marketing/:path*", headers: [marketingAssetCache] },
      { source: "/icons/:path*", headers: [marketingAssetCache] },
      { source: "/og.png", headers: [marketingAssetCache] },
      { source: "/favicon.svg", headers: [marketingAssetCache] },
    ];
  },

  async redirects() {
    return [
      {
        // The sidebar item is labeled "Dashboard" but the route is "/";
        // people type /dashboard and hit a 404 without this.
        source: "/dashboard",
        destination: "/",
        permanent: false,
      },
      {
        source: "/tech",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/tech/jobs",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/tech/profile",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/sign-up",
        destination: "/signup",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
