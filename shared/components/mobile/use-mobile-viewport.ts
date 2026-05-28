"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const BELOW_LG_MEDIA_QUERY = "(max-width: 1023px)";

function subscribeToMediaQuery(
  query: string,
  callback: () => void,
): () => void {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", callback);

  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

function getMediaQuerySnapshot(query: string): boolean {
  return window.matchMedia(query).matches;
}

export function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    function update() {
      setIsMobile(mediaQuery.matches);
    }

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}

/** Matches Tailwind `lg:` — true when viewport is below the large breakpoint. */
export function useIsBelowLg(): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToMediaQuery(BELOW_LG_MEDIA_QUERY, callback),
    () => getMediaQuerySnapshot(BELOW_LG_MEDIA_QUERY),
    () => true,
  );
}
