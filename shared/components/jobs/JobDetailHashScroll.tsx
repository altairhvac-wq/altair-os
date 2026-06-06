"use client";

import { useEffect } from "react";

/**
 * Scrolls to in-page hash targets inside admin detail pages.
 */
export function JobDetailHashScroll() {
  useEffect(() => {
    let frame = 0;

    const scrollToHashTarget = () => {
      const hash = window.location.hash;

      if (!hash || hash.length <= 1) {
        return;
      }

      const targetId = decodeURIComponent(hash.slice(1));
      const element = document.getElementById(targetId);

      if (!element) {
        return;
      }

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);

    return () => {
      window.removeEventListener("hashchange", scrollToHashTarget);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
