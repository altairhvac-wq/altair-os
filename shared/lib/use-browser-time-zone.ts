"use client";

import { useSyncExternalStore } from "react";
import { getBrowserTimeZone } from "@/shared/lib/datetime";

function subscribe(): () => void {
  // A browser's time zone does not change while a page is open.
  return () => {};
}

function readBrowserTimeZone(): string | null {
  return getBrowserTimeZone() ?? null;
}

function readOnServer(): null {
  return null;
}

/**
 * The time zone this browser is set to ("America/Chicago"), or null on the
 * server and until the page has hydrated.
 *
 * It is a suggestion to put in front of the person, or to record once when a
 * company is created. It is never what a company's dates are worked out in:
 * that is always the company's own resolved zone, which is the same on the
 * server and in every browser.
 */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(subscribe, readBrowserTimeZone, readOnServer);
}
