"use client";

import { useEffect } from "react";
import { isAnalyticsAllowed } from "@/shared/lib/analytics/client";
import { isDirectoryListingEvent, type DirectoryListingEvent } from "@/shared/types/directory";

/**
 * Counts views of a listing page and taps on its call, website and map
 * buttons, for the business's own monthly numbers (migration 214).
 *
 * What is sent: the listing's public slug and one word ("view", "call",
 * "website", "directions"). Nothing about the visitor. Our own devices and
 * visitors who opted out of the site's counter are not counted (the same
 * rule as the site's visit counter), a view is counted once per listing per
 * browser tab session, and the route drops bots.
 *
 * A tap is any press on an element marked `data-listing-event` inside the
 * page. Renders nothing.
 */

const ENDPOINT = "/api/directory/listing-event";

function send(slug: string, event: DirectoryListingEvent): void {
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, event }),
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // Counting must never affect the page.
  }
}

export function ListingStatsBeacon({ slug }: { readonly slug: string }) {
  useEffect(() => {
    if (!isAnalyticsAllowed()) return;
    const key = `altair_dir_view_${slug}`;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(key) === "1";
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: count the view; at worst a reload counts twice.
    }
    if (!seen) send(slug, "view");

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-listing-event]") : null;
      const name = target?.dataset.listingEvent;
      if (isDirectoryListingEvent(name) && name !== "view") send(slug, name);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug]);

  return null;
}
