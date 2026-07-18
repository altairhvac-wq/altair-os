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
 * overlay panel (dialog, sheet, drawer). Shared by `AltairDialogContent` and
 * `MobileSheetPanel` so both portal-mounted panels initialize focus only after
 * their DOM exists — never from a parent that still renders `ModalPortal` as
 * `null` on the first commit.
 *
 * A descendant can opt into a specific initial focus target with
 * `data-altair-dialog-initial-focus` (dialogs) or
 * `data-mobile-sheet-initial-focus` (sheets); otherwise the first focusable
 * descendant is used, falling back to the panel itself.
 */
export function useDialogFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  initialFocusAttribute:
    | "data-altair-dialog-initial-focus"
    | "data-mobile-sheet-initial-focus" = "data-altair-dialog-initial-focus",
) {
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
      `[${initialFocusAttribute}]`,
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
  }, [panelRef, initialFocusAttribute]);
}
