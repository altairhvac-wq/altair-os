"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pageview } from "@/shared/lib/meta-pixel";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

/**
 * When the pixel loads: on the visitor's first tap, click, key press or
 * scroll, or FALLBACK_DELAY_MS after the page has loaded, whichever comes
 * first.
 *
 * The pixel is the heaviest thing on the homepage: about 270 KB of
 * third-party script (fbevents.js plus its config) and around 0.3 s of
 * phone processing. Loading it right after the page (Next's "lazyOnload")
 * kept it off the first paint, but it still landed in the seconds when a
 * visitor starts scrolling and tapping. The owner chose this trade-off on
 * 2026-11-12: a visitor who leaves within the first few seconds without
 * touching anything is not counted in Meta. Anyone who interacts, or simply
 * stays to read, still is.
 */
const FALLBACK_DELAY_MS = 5000;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

/**
 * Module-level guards survive React Strict Mode remounts, so the pixel is
 * injected once and pathname changes are not double-fired in development.
 */
let pixelRequested = false;
let routeTrackingBootstrapped = false;
let lastTrackedPathname: string | null = null;

/** Meta's standard base code, run from here instead of an inline script. */
function loadPixel(pixelId: string) {
  if (pixelRequested || typeof window === "undefined") return;
  pixelRequested = true;
  if (window.fbq) return;

  const stub = function (...args: unknown[]) {
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  } as unknown as FacebookPixel;
  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  stub.queue = [];
  window.fbq = stub;
  window._fbq ??= stub;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

/**
 * Meta Pixel for the public site (mounted in app/(marketing)/layout.tsx
 * only), loaded late on purpose; see FALLBACK_DELAY_MS. Tracks SPA
 * navigations once it is loaded; a navigation before then is covered by
 * the PageView the base code sends for the page the visitor is on.
 *
 * Future Lead: fire `metaPixel.event("Lead", { content_name: "…" })`
 * only after a successful demo-request / contact / signup acceptance —
 * never on form open, click, submit start, or failure.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID || pixelRequested) return;

    let timer: number | undefined;
    const start = () => {
      cleanup();
      loadPixel(META_PIXEL_ID);
    };
    const cleanup = () => {
      for (const name of INTERACTION_EVENTS) window.removeEventListener(name, start);
      window.removeEventListener("load", arm);
      if (timer !== undefined) window.clearTimeout(timer);
    };
    const arm = () => {
      timer = window.setTimeout(start, FALLBACK_DELAY_MS);
    };

    for (const name of INTERACTION_EVENTS) window.addEventListener(name, start, { once: true, passive: true });
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    return cleanup;
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID) {
      return;
    }

    if (!routeTrackingBootstrapped) {
      routeTrackingBootstrapped = true;
      lastTrackedPathname = pathname;
      return;
    }

    if (lastTrackedPathname === pathname) {
      return;
    }

    lastTrackedPathname = pathname;
    // No-ops until the pixel has loaded.
    pageview();
  }, [pathname]);

  if (!META_PIXEL_ID) {
    return null;
  }

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript fallback */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
