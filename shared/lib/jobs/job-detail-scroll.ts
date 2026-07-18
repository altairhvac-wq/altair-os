/**
 * In-page scroll helpers for Job Detail section and workflow navigation.
 * Presentation-only — does not mutate job state.
 */

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

export function scrollToJobDetailSection(
  sectionId: string,
  options: ScrollJobDetailSectionOptions = {},
): boolean {
  const element = findJobDetailSectionElement(sectionId);
  if (!element) {
    return false;
  }

  const behavior =
    options.behavior ??
    (prefersReducedMotion() ? "auto" : "smooth");

  element.scrollIntoView({ behavior, block: "start" });

  if (options.updateHash !== false) {
    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }

  if (options.focus) {
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

  return true;
}
