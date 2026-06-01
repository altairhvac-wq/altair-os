"use client";

import { useSyncExternalStore } from "react";

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
  return useSyncExternalStore(
    (callback) => subscribeToMediaQuery(MOBILE_MEDIA_QUERY, callback),
    () => getMediaQuerySnapshot(MOBILE_MEDIA_QUERY),
    () => true,
  );
}

/** Matches Tailwind `lg:` — true when viewport is below the large breakpoint. */
export function useIsBelowLg(): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToMediaQuery(BELOW_LG_MEDIA_QUERY, callback),
    () => getMediaQuerySnapshot(BELOW_LG_MEDIA_QUERY),
    () => true,
  );
}
