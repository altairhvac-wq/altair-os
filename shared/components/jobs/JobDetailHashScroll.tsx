"use client";

import { useEffect } from "react";

/**
 * Scrolls to in-page hash targets on job detail (e.g. profitability section).
 */
export function JobDetailHashScroll() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash || hash.length <= 1) {
      return;
    }

    const targetId = decodeURIComponent(hash.slice(1));
    const element = document.getElementById(targetId);

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
