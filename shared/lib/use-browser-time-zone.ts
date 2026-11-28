"use client";

import { useSyncExternalStore } from "react";
import { getBrowserTimeZone, isPlaceTimeZone } from "@/shared/lib/datetime";

function subscribe(): () => void {
  // A browser's time zone does not change while a page is open.
  return () => {};
}

function readBrowserTimeZone(): string | null {
  const zone = getBrowserTimeZone();
  // A browser that reports UTC is hiding its zone, not sitting in Greenwich.
  return zone && isPlaceTimeZone(zone) ? zone : null;
}

function readOnServer(): null {
  return null;
}

/**
 * The time zone this browser is set to ("America/Chicago"), or null on the
 * server, until the page has hydrated, and for a browser that only reports
 * UTC (isPlaceTimeZone).
 *
 * It is a suggestion to put in front of the person, or to record once when a
 * company is created. It is never what a company's dates are worked out in:
 * that is always the company's own resolved zone, which is the same on the
 * server and in every browser.
 */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(subscribe, readBrowserTimeZone, readOnServer);
}
