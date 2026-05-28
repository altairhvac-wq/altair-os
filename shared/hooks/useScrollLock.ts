"use client";

import { useEffect, useRef } from "react";

let lockCount = 0;
let previousOverflow = "";

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockCount += 1;
    if (lockCount === 1) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}

let nextEscapeId = 0;
const escapeHandlers = new Map<number, () => void>();
let escapeStack: number[] = [];

function handleDocumentEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  const topId = escapeStack[escapeStack.length - 1];
  if (topId === undefined) {
    return;
  }

  const onClose = escapeHandlers.get(topId);
  if (!onClose) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onClose();
}

/** Only the most recently opened active sheet receives Escape. */
export function useSheetEscape(onClose: () => void, active = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) {
      return;
    }

    const id = nextEscapeId++;
    escapeHandlers.set(id, () => onCloseRef.current());
    escapeStack.push(id);

    if (escapeStack.length === 1) {
      document.addEventListener("keydown", handleDocumentEscape);
    }

    return () => {
      escapeStack = escapeStack.filter((entryId) => entryId !== id);
      escapeHandlers.delete(id);
      if (escapeStack.length === 0) {
        document.removeEventListener("keydown", handleDocumentEscape);
      }
    };
  }, [active]);
}
