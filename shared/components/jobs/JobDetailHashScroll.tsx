"use client";

import { useEffect } from "react";
import {
  prefersReducedMotion,
  scrollToJobDetailSection,
} from "@/shared/lib/jobs/job-detail-scroll";

/**
 * Scrolls to in-page hash targets inside admin Job Detail pages.
 */
export function JobDetailHashScroll() {
  useEffect(() => {
    let frame = 0;

    const scrollToHashTarget = (focus = false) => {
      const hash = window.location.hash;

      if (!hash || hash.length <= 1) {
        return;
      }

      const targetId = decodeURIComponent(hash.slice(1));

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        scrollToJobDetailSection(targetId, {
          updateHash: false,
          focus,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      });
    };

    // Allow layout to settle before initial hash scroll.
    frame = window.requestAnimationFrame(() => {
      scrollToHashTarget(true);
    });

    const onHashChange = () => scrollToHashTarget(true);
    const onPopState = () => scrollToHashTarget(false);

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
