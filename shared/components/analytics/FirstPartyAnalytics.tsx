"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEngagement, trackPageview } from "@/shared/lib/analytics/client";

/**
 * First-party pageview tracking (migration 202). Mounted once in the root
 * layout so the marketing site, the auth pages and the product share one
 * count. Renders nothing. See shared/lib/analytics/client.ts for what is sent
 * and who is excluded.
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (pathname) trackPageview(pathname, search);
  }, [pathname, search]);

  return null;
}

const TEMPLATE_DOWNLOAD = /^\/resources\/templates\/([a-z0-9][a-z0-9-]{0,63})$/;

/**
 * Engagement tracking (migration 209): which trial buttons are pressed, which
 * templates are downloaded and whether the commercial is played.
 *
 * Two listeners on the document rather than a handler on every button: a new
 * page or a new "Start trial" link is counted without anyone remembering to
 * wire it, and server components stay server components.
 *
 * What is read from the page is only where a link points and, for a trial
 * button, an optional `data-cta` name written in our own markup. Nothing a
 * visitor typed is read, and the muted preview loop on the homepage is not a
 * play: only a video the visitor started with sound counts.
 */
function EngagementTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      let url: URL;
      try {
        url = new URL(target.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === "/signup") {
        trackEngagement("cta_click", target.dataset.cta ?? "signup", { repeat: true });
        return;
      }
      const template = TEMPLATE_DOWNLOAD.exec(url.pathname);
      if (template) trackEngagement("template_download", template[1], { repeat: true });
    };

    const onPlay = (event: Event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement)) return;
      if (video.muted && video.loop) return;
      trackEngagement("video_play", video.dataset.video ?? "commercial");
    };

    document.addEventListener("click", onClick);
    // Media events do not bubble; capture is the only way to hear them here.
    document.addEventListener("play", onPlay, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("play", onPlay, true);
    };
  }, []);

  return null;
}

export function FirstPartyAnalytics() {
  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <EngagementTracker />
    </>
  );
}
