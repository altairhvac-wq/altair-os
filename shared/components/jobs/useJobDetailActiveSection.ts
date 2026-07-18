"use client";

import { useEffect, useState } from "react";
import {
  findJobDetailSectionElement,
  isElementEffectivelyVisible,
} from "@/shared/lib/jobs/job-detail-scroll";

/**
 * Tracks which Job Detail section is in view via IntersectionObserver.
 */
export function useJobDetailActiveSection(
  sectionIds: string[],
  immediateActiveId?: string | null,
): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    immediateActiveId ?? sectionIds[0] ?? null,
  );

  useEffect(() => {
    if (!immediateActiveId) {
      return;
    }

    setActiveId(immediateActiveId);
  }, [immediateActiveId]);

  useEffect(() => {
    if (sectionIds.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const elements = sectionIds
      .map((id) => findJobDetailSectionElement(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id || entry.target.getAttribute("data-job-section");
          if (!id) {
            continue;
          }
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestId: string | null = null;
        let bestRatio = 0;
        for (const id of sectionIds) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        if (bestId) {
          setActiveId(bestId);
          return;
        }

        // Fallback: first visible section by document order
        for (const id of sectionIds) {
          const element = findJobDetailSectionElement(id);
          if (element && isElementEffectivelyVisible(element)) {
            const rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.45 && rect.bottom > 80) {
              setActiveId(id);
              return;
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
