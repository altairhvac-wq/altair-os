"use client";

import { useBrowserTimeZone } from "@/shared/lib/use-browser-time-zone";

/**
 * Sends the browser's time zone along with the form that creates a company,
 * so a new company starts in the zone its owner is sitting in instead of a
 * fallback. Empty until the page has hydrated, and the server checks the
 * value before using it (lib/database/queries/company-timezone.ts).
 */
export function BrowserTimeZoneField() {
  const timeZone = useBrowserTimeZone();
  return <input type="hidden" name="browserTimeZone" value={timeZone ?? ""} />;
}
