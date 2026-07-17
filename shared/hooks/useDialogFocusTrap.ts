"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Initial focus, Tab/Shift+Tab focus trapping, and focus restoration for an
 * overlay panel (dialog, sheet, drawer). This is the same mechanic already
 * proven in `shared/components/ui/mobile-sheet/MobileSheet.tsx`, extracted
 * so `AltairDialog` can reuse it instead of hand-rolling a second focus-trap
 * implementation. `MobileSheet` itself is intentionally left untouched and
 * does not consume this hook — it keeps its own inline copy.
 *
 * A descendant can opt into a specific initial focus target with
 * `data-altair-dialog-initial-focus` (mirrors MobileSheet's
 * `data-mobile-sheet-initial-focus`); otherwise the first focusable
 * descendant is used, falling back to the panel itself.
 */
export function useDialogFocusTrap(panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const panel: HTMLElement | null = panelRef.current;
    if (!panel) {
      return;
    }
    const panelElement: HTMLElement = panel;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    function getFocusableElements() {
      return Array.from(
        panelElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);
    }

    const requestedFocus = panelElement.querySelector<HTMLElement>(
      "[data-altair-dialog-initial-focus]",
    );
    const initialFocus =
      requestedFocus ?? getFocusableElements()[0] ?? panelElement;
    initialFocus.focus({ preventScroll: true });

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelElement.focus({ preventScroll: true });
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === first || !panelElement.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || !panelElement.contains(activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    panelElement.addEventListener("keydown", trapFocus);

    return () => {
      panelElement.removeEventListener("keydown", trapFocus);
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [panelRef]);
}
