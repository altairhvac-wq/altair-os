/**
 * In-page scroll helpers for Job Detail section and workflow navigation.
 * Presentation-only — does not mutate job state.
 */

import { dispatchJobDetailSectionSelect } from "@/shared/lib/jobs/job-detail-tabs";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isElementEffectivelyVisible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) {
    return false;
  }

  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

export function findJobDetailSectionElement(
  sectionId: string,
): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const byId = document.getElementById(sectionId);
  if (byId instanceof HTMLElement && isElementEffectivelyVisible(byId)) {
    return byId;
  }

  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-job-section="${sectionId}"]`,
  );

  for (const candidate of candidates) {
    if (isElementEffectivelyVisible(candidate)) {
      return candidate;
    }
  }

  if (byId instanceof HTMLElement) {
    return byId;
  }

  return candidates[0] ?? null;
}

export type ScrollJobDetailSectionOptions = {
  updateHash?: boolean;
  focus?: boolean;
  behavior?: ScrollBehavior;
};

function focusJobDetailSection(
  element: HTMLElement,
  focus: boolean | undefined,
): void {
  if (!focus) {
    return;
  }

  const previousTabIndex = element.getAttribute("tabindex");
  if (previousTabIndex === null) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
  if (previousTabIndex === null) {
    const restore = () => {
      element.removeAttribute("tabindex");
      element.removeEventListener("blur", restore);
    };
    element.addEventListener("blur", restore);
  }
}

export function scrollToJobDetailSection(
  sectionId: string,
  options: ScrollJobDetailSectionOptions = {},
): boolean {
  // Let tab panels mount before measuring/scrolling.
  dispatchJobDetailSectionSelect(sectionId);

  if (options.updateHash !== false) {
    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }

  const behavior =
    options.behavior ??
    (prefersReducedMotion() ? "auto" : "smooth");

  const tryScroll = (): boolean => {
    const element = findJobDetailSectionElement(sectionId);
    if (!element) {
      return false;
    }

    element.scrollIntoView({ behavior, block: "start" });
    focusJobDetailSection(element, options.focus);
    return true;
  };

  if (tryScroll()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  // Tab switch may need a paint before the panel exists.
  window.requestAnimationFrame(() => {
    if (tryScroll()) {
      return;
    }
    window.requestAnimationFrame(() => {
      tryScroll();
    });
  });

  return true;
}
